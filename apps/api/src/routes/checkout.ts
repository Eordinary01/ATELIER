import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import crypto from 'node:crypto';
import {
  getDbClient,
  orders,
  orderItems,
  payments,
  addresses,
  shipments,
  returnsAndRefunds,
  productVariants,
  inventory,
  eq,
  and,
  inArray,
} from '@atelier/database';
import { ApiResponseSchema, CurrencyPaiseSchema } from '@atelier/contract';
import { BadRequestError, NotFoundError } from '../lib/errors.js';
import {
  createRazorpayOrder,
  verifyRazorpaySignature,
  getRazorpayKeyId,
} from '../services/razorpay.js';
import { sendOrderConfirmationEmail, sendRefundNotificationEmail } from '../services/email.js';
import { reserveStockHold, commitStockHold } from '../services/stockReservation.js';


const CheckoutItemInputSchema = z.object({
  variantId: z.string().uuid(),
  quantity: z.number().int().min(1).max(10),
});

const AddressInputSchema = z.object({
  name: z.string().min(1),
  phone: z.string().min(10),
  addressLine1: z.string().min(3),
  addressLine2: z.string().optional(),
  city: z.string().min(2),
  state: z.string().min(2),
  postalCode: z.string().regex(/^\d{6}$/, 'Enter valid 6-digit Indian PIN code'),
  country: z.string().default('India'),
});

const CreateOrderRequestSchema = z.object({
  items: z.array(CheckoutItemInputSchema).min(1),
  customer: z.object({
    name: z.string().min(1),
    email: z.string().email(),
    phone: z.string().min(10),
  }),
  shippingAddress: AddressInputSchema,
  billingAddress: AddressInputSchema.optional(),
  couponCode: z.string().optional(),
  notes: z.string().optional(),
  userId: z.string().uuid().optional(),
  saveAddress: z.boolean().optional(),
});

const VerifyPaymentRequestSchema = z.object({
  orderId: z.string().uuid(),
  razorpayOrderId: z.string(),
  razorpayPaymentId: z.string(),
  razorpaySignature: z.string(),
});

export const checkoutRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  const typedFastify = fastify.withTypeProvider<ZodTypeProvider>();

  // 1. INITIALIZE CHECKOUT & RAZORPAY ORDER
  typedFastify.post(
    '/create-order',
    {
      schema: {
        body: CreateOrderRequestSchema,
        response: {
          201: ApiResponseSchema(
            z.object({
              orderId: z.string().uuid(),
              orderNumber: z.string(),
              razorpayOrderId: z.string(),
              amountPaise: CurrencyPaiseSchema,
              currency: z.literal('INR'),
              razorpayKeyId: z.string(),
              isSimulated: z.boolean(),
            })
          ),
        },
      },
    },
    async (request, reply) => {
      const payload = request.body;
      const db = getDbClient();

      const variantIds = payload.items.map((i) => i.variantId);

      // Fetch variants with product & inventory details
      const dbVariants = await db.query.productVariants.findMany({
        where: inArray(productVariants.id, variantIds),
        with: {
          product: true,
          inventory: true,
        },
      });

      if (dbVariants.length !== variantIds.length) {
        throw new BadRequestError('One or more selected garment variants could not be found.');
      }

      // Check stock availability
      for (const item of payload.items) {
        const found = dbVariants.find((v) => v.id === item.variantId);
        if (!found) continue;

        const available = found.inventory?.quantityAvailable ?? 0;
        if (available < item.quantity) {
          throw new BadRequestError(
            `Insufficient stock for "${found.product.title}" (${found.size}). Requested: ${item.quantity}, Available: ${available}`
          );
        }
      }

      // Calculate totals
      let subtotalPaise = 0;
      const itemsWithPrice = payload.items.map((item) => {
        const variant = dbVariants.find((v) => v.id === item.variantId)!;
        const unitPricePaise = variant.priceOverridePaise || variant.product.basePricePaise;
        const lineTotal = unitPricePaise * item.quantity;
        subtotalPaise += lineTotal;

        return {
          variant,
          quantity: item.quantity,
          unitPricePaise,
          lineTotal,
          taxRatePercent: variant.product.gstRatePercent,
        };
      });

      const freeShippingThresholdPaise = 199900; // ₹1,999
      const isFreeShipping = subtotalPaise >= freeShippingThresholdPaise;
      const shippingFeePaise = isFreeShipping ? 0 : 15000; // ₹150

      let discountPaise = 0;
      if (payload.couponCode?.trim().toUpperCase() === 'ATELIER10') {
        discountPaise = Math.round(subtotalPaise * 0.1);
      }

      // 12% GST breakdown calculation
      const taxableAmountPaise = Math.max(0, subtotalPaise - discountPaise);
      const taxPaise = Math.round((taxableAmountPaise * 12) / 112); // embedded GST
      const totalPaise = taxableAmountPaise + shippingFeePaise;

      // Unique human-readable order number
      const randomSuffix = crypto.randomBytes(3).toString('hex').toUpperCase();
      const orderNumber = `ATL-${Date.now().toString(36).toUpperCase()}-${randomSuffix}`;
      const idempotencyKey = `idemp_${crypto.randomBytes(12).toString('hex')}`;

      // Insert shipping address
      const [shippingAddr] = await db
        .insert(addresses)
        .values({
          userId: payload.saveAddress && payload.userId ? payload.userId : null,
          type: 'shipping',
          name: payload.shippingAddress.name,
          phone: payload.shippingAddress.phone,
          addressLine1: payload.shippingAddress.addressLine1,
          addressLine2: payload.shippingAddress.addressLine2 || null,
          city: payload.shippingAddress.city,
          state: payload.shippingAddress.state,
          postalCode: payload.shippingAddress.postalCode,
          country: payload.shippingAddress.country || 'India',
          isDefault: Boolean(payload.saveAddress),
        })
        .returning();

      if (!shippingAddr) {
        throw new Error('Failed to record shipping destination');
      }

      // Create Order
      const [newOrder] = await db
        .insert(orders)
        .values({
          orderNumber,
          userId: payload.userId || null,
          guestEmail: payload.customer.email,
          guestPhone: payload.customer.phone,
          shippingAddressId: shippingAddr.id,
          billingAddressId: shippingAddr.id,
          subtotalPaise,
          discountPaise,
          shippingFeePaise,
          taxPaise,
          totalPaise,
          status: 'pending_payment',
          paymentMethod: 'online',
          paymentStatus: 'pending',
          idempotencyKey,
          notes: payload.notes || null,
        })
        .returning();

      if (!newOrder) {
        throw new Error('Failed to initialize customer order');
      }

      // Insert Order Items
      for (const item of itemsWithPrice) {
        const itemTaxPaise = Math.round((item.lineTotal * item.taxRatePercent) / 100);
        await db.insert(orderItems).values({
          orderId: newOrder.id,
          variantId: item.variant.id,
          productTitle: item.variant.product.title,
          variantLabel: `${item.variant.size} / ${item.variant.colorName}`,
          sku: item.variant.sku,
          unitPricePaise: item.unitPricePaise,
          quantity: item.quantity,
          totalPricePaise: item.lineTotal,
          taxRatePercent: item.taxRatePercent,
          taxAmountPaise: itemTaxPaise,
        });
      }

      // 15-Minute Atomic Stock Hold in Redis + PostgreSQL
      await reserveStockHold(
        newOrder.id,
        payload.items.map((i) => ({ variantId: i.variantId, quantity: i.quantity }))
      );

      // Create Razorpay Order
      const razorpayOrder = await createRazorpayOrder({

        amountPaise: totalPaise,
        currency: 'INR',
        receipt: orderNumber,
        notes: {
          orderNumber,
          customerEmail: payload.customer.email,
          customerName: payload.customer.name,
        },
      });

      // Record in payments table
      await db.insert(payments).values({
        orderId: newOrder.id,
        gatewayProvider: 'razorpay',
        gatewayOrderId: razorpayOrder.id,
        amountPaise: totalPaise,
        currency: 'INR',
        status: 'pending',
      });

      return reply.status(201).send({
        success: true,
        data: {
          orderId: newOrder.id,
          orderNumber,
          razorpayOrderId: razorpayOrder.id,
          amountPaise: totalPaise,
          currency: 'INR',
          razorpayKeyId: getRazorpayKeyId(),
          isSimulated: razorpayOrder.isSimulated,
        },
      });
    }
  );

  // 2. VERIFY RAZORPAY PAYMENT & CONFIRM ORDER
  typedFastify.post(
    '/verify-payment',
    {
      schema: {
        body: VerifyPaymentRequestSchema,
        response: {
          200: ApiResponseSchema(
            z.object({
              verified: z.literal(true),
              orderNumber: z.string(),
              status: z.string(),
            })
          ),
        },
      },
    },
    async (request, reply) => {
      const { orderId, razorpayOrderId, razorpayPaymentId, razorpaySignature } = request.body;
      const db = getDbClient();

      // Verify cryptographic signature
      const isValid = verifyRazorpaySignature({
        orderId: razorpayOrderId,
        paymentId: razorpayPaymentId,
        signature: razorpaySignature,
      });

      if (!isValid) {
        throw new BadRequestError('Invalid or corrupted Razorpay payment signature');
      }

      // Fetch order
      const [existingOrder] = await db
        .select()
        .from(orders)
        .where(eq(orders.id, orderId))
        .limit(1);

      if (!existingOrder) {
        throw new NotFoundError(`Order '${orderId}' not found`);
      }

      if (existingOrder.paymentStatus === 'captured') {
        return reply.send({
          success: true,
          data: {
            verified: true,
            orderNumber: existingOrder.orderNumber,
            status: existingOrder.status,
          },
        });
      }

      // Update Order Status
      await db
        .update(orders)
        .set({
          status: 'confirmed',
          paymentStatus: 'captured',
          updatedAt: new Date(),
        })
        .where(eq(orders.id, orderId));

      // Update Payment Record
      await db
        .update(payments)
        .set({
          gatewayPaymentId: razorpayPaymentId,
          gatewaySignature: razorpaySignature,
          status: 'captured',
          updatedAt: new Date(),
        })
        .where(eq(payments.orderId, orderId));

      // Fetch items and commit stock hold
      const dbOrderItems = await db
        .select()
        .from(orderItems)
        .where(eq(orderItems.orderId, orderId));

      await commitStockHold(
        orderId,
        dbOrderItems.map((i) => ({ variantId: i.variantId, quantity: i.quantity }))
      );

      // Fetch shipping address for email

      const [shipAddr] = await db
        .select()
        .from(addresses)
        .where(eq(addresses.id, existingOrder.shippingAddressId))
        .limit(1);

      const addressString = shipAddr
        ? `${shipAddr.name}, ${shipAddr.addressLine1}${shipAddr.addressLine2 ? ', ' + shipAddr.addressLine2 : ''}, ${shipAddr.city}, ${shipAddr.state} - ${shipAddr.postalCode}`
        : 'Confirmed Shipping Address';

      // Send Order Confirmation Email via Brevo
      if (existingOrder.guestEmail) {
        sendOrderConfirmationEmail({
          orderNumber: existingOrder.orderNumber,
          customerName: shipAddr?.name || 'Patron',
          customerEmail: existingOrder.guestEmail,
          items: dbOrderItems.map((item) => ({
            title: item.productTitle,
            size: item.variantLabel.split('/')[0]?.trim() || 'One Size',
            color: item.variantLabel.split('/')[1]?.trim() || 'Core',
            quantity: item.quantity,
            pricePaise: item.unitPricePaise,
          })),
          totalPaise: existingOrder.totalPaise,
          shippingAddress: addressString,
        }).catch((err) => {
          console.error('Failed to dispatch order confirmation email:', err);
        });
      }

      return reply.send({
        success: true,
        data: {
          verified: true,
          orderNumber: existingOrder.orderNumber,
          status: 'confirmed',
        },
      });
    }
  );

  // 3. GET ORDER BY ORDER NUMBER (For Order Success & Tracking)
  typedFastify.get(
    '/orders/:orderNumber',
    {
      schema: {
        params: z.object({
          orderNumber: z.string().min(1),
        }),
      },
    },
    async (request, reply) => {
      const { orderNumber } = request.params;
      const db = getDbClient();

      let [order] = await db
        .select()
        .from(orders)
        .where(eq(orders.orderNumber, orderNumber))
        .limit(1);

      let orderShipment = null;

      // If not found directly by orderNumber, check if input was a trackingNumber / AWB
      if (!order) {
        const [foundShipment] = await db
          .select()
          .from(shipments)
          .where(eq(shipments.trackingNumber, orderNumber))
          .limit(1);

        if (foundShipment) {
          orderShipment = foundShipment;
          const [matchedOrder] = await db
            .select()
            .from(orders)
            .where(eq(orders.id, foundShipment.orderId))
            .limit(1);
          order = matchedOrder;
        }
      }

      if (!order) {
        throw new NotFoundError(`Commission order or tracking number '${orderNumber}' not found`);
      }

      // Fetch shipment if not already retrieved
      if (!orderShipment) {
        const [foundShipment] = await db
          .select()
          .from(shipments)
          .where(eq(shipments.orderId, order.id))
          .limit(1);
        orderShipment = foundShipment || null;
      }

      const [shippingAddr] = await db
        .select()
        .from(addresses)
        .where(eq(addresses.id, order.shippingAddressId))
        .limit(1);

      const items = await db
        .select()
        .from(orderItems)
        .where(eq(orderItems.orderId, order.id));

      const returnTickets = await db
        .select()
        .from(returnsAndRefunds)
        .where(eq(returnsAndRefunds.orderId, order.id));

      return reply.send({
        success: true,
        data: {
          id: order.id,
          orderNumber: order.orderNumber,
          status: order.status,
          subtotalPaise: order.subtotalPaise,
          discountPaise: order.discountPaise,
          shippingFeePaise: order.shippingFeePaise,
          taxPaise: order.taxPaise,
          totalPaise: order.totalPaise,
          paymentStatus: order.paymentStatus,
          paymentMethod: order.paymentMethod,
          createdAt: order.createdAt.toISOString(),
          customerEmail: order.guestEmail,
          shippingAddress: shippingAddr || null,
          shipment: orderShipment
            ? {
                id: orderShipment.id,
                carrier: orderShipment.carrier,
                trackingNumber: orderShipment.trackingNumber,
                trackingUrl: orderShipment.trackingUrl,
                status: orderShipment.status,
                dispatchedAt: orderShipment.dispatchedAt ? orderShipment.dispatchedAt.toISOString() : null,
                deliveredAt: orderShipment.deliveredAt ? orderShipment.deliveredAt.toISOString() : null,
                updatedAt: orderShipment.updatedAt.toISOString(),
              }
            : null,
          items: items.map((i) => ({
            id: i.id,
            title: i.productTitle,
            variantLabel: i.variantLabel,
            sku: i.sku,
            unitPricePaise: i.unitPricePaise,
            quantity: i.quantity,
            totalPricePaise: i.totalPricePaise,
          })),
          returns: returnTickets.map((r) => ({
            id: r.id,
            orderItemId: r.orderItemId,
            reason: r.reason,
            detailedNotes: r.detailedNotes,
            status: r.status,
            refundAmountPaise: r.refundAmountPaise,
            createdAt: r.createdAt.toISOString(),
          })),
        },
      });
    }
  );

  // 4. CANCEL COMMISSION ORDER (User-facing with stock restoration & refund initiation)
  typedFastify.post(
    '/orders/:orderNumber/cancel',
    {
      schema: {
        params: z.object({
          orderNumber: z.string().min(1),
        }),
        body: z.object({
          reason: z.string().min(2),
          notes: z.string().optional(),
          customerEmail: z.string().email().optional(),
        }),
      },
    },
    async (request, reply) => {
      const { orderNumber } = request.params;
      const { reason, notes, customerEmail } = request.body;
      const db = getDbClient();

      const [order] = await db
        .select()
        .from(orders)
        .where(eq(orders.orderNumber, orderNumber))
        .limit(1);

      if (!order) {
        throw new NotFoundError(`Commission order '${orderNumber}' not found`);
      }

      // Check if already cancelled
      if (order.status === 'cancelled') {
        throw new BadRequestError('This commission order has already been cancelled.');
      }

      // Check if eligible for cancellation
      const nonCancellableStatuses = ['shipped', 'delivered', 'refunded'];
      if (nonCancellableStatuses.includes(order.status)) {
        throw new BadRequestError(
          `Order cannot be cancelled in '${order.status}' stage. Since garments have already been handed over to the courier partner, please request an exchange or return upon delivery.`
        );
      }

      // 1. Restore Inventory Stock for all items in this order
      const items = await db
        .select()
        .from(orderItems)
        .where(eq(orderItems.orderId, order.id));

      for (const item of items) {
        const [inv] = await db
          .select()
          .from(inventory)
          .where(eq(inventory.variantId, item.variantId))
          .limit(1);

        if (inv) {
          await db
            .update(inventory)
            .set({
              quantityAvailable: inv.quantityAvailable + item.quantity,
              updatedAt: new Date(),
            })
            .where(eq(inventory.id, inv.id));
        }
      }

      // 2. Update Payment & Refund Record if payment was captured
      const isPaid = order.paymentStatus === 'captured';
      const newPaymentStatus = isPaid ? 'refunded' : order.paymentStatus;

      if (isPaid) {
        await db
          .update(payments)
          .set({ status: 'refunded', updatedAt: new Date() })
          .where(eq(payments.orderId, order.id));

        if (items.length > 0 && items[0]) {
          await db.insert(returnsAndRefunds).values({
            orderId: order.id,
            orderItemId: items[0].id,
            reason: 'changed_mind',
            detailedNotes: `Patron Order Cancellation: ${reason}${notes ? ` - ${notes}` : ''}`,
            status: 'approved',
            refundAmountPaise: order.totalPaise,
          });
        }
      }

      // 3. Update Order Status to Cancelled
      const cancellationNote = `[Cancelled by Patron: ${reason}]${notes ? ` Notes: ${notes}` : ''}`;
      const updatedNotes = order.notes ? `${order.notes}\n${cancellationNote}` : cancellationNote;

      const [updatedOrder] = await db
        .update(orders)
        .set({
          status: 'cancelled',
          paymentStatus: newPaymentStatus,
          notes: updatedNotes,
          updatedAt: new Date(),
        })
        .where(eq(orders.id, order.id))
        .returning();

      // 4. Send Brevo Notification Email if patron email is available
      const recipientEmail = customerEmail || order.guestEmail;
      if (recipientEmail) {
        const [shipAddr] = await db
          .select()
          .from(addresses)
          .where(eq(addresses.id, order.shippingAddressId))
          .limit(1);

        sendRefundNotificationEmail({
          orderNumber: order.orderNumber,
          customerName: shipAddr?.name || 'Patron',
          customerEmail: recipientEmail,
          refundAmountPaise: order.totalPaise,
          reason,
        }).catch((err) => {
          console.error('Failed to send cancellation refund email:', err);
        });
      }

      return reply.send({
        success: true,
        data: {
          orderNumber: updatedOrder?.orderNumber || order.orderNumber,
          status: 'cancelled',
          paymentStatus: newPaymentStatus,
          refundAmountPaise: order.totalPaise,
          restockedItemsCount: items.length,
          message: isPaid
            ? 'Commission successfully cancelled. A full refund of ₹' + (order.totalPaise / 100).toLocaleString('en-IN') + ' has been initiated.'
            : 'Commission successfully cancelled.',
        },
      });
    }
  );

  // 5. INITIATE RETURN OR BESPOKE EXCHANGE (User-facing Concierge)
  typedFastify.post(
    '/orders/:orderNumber/return-exchange',
    {
      schema: {
        params: z.object({
          orderNumber: z.string().min(1),
        }),
        body: z.object({
          type: z.enum(['exchange', 'return']),
          orderItemId: z.string().uuid(),
          reason: z.enum(['size_fit', 'defective', 'wrong_item', 'changed_mind']),
          detailedNotes: z.string().optional(),
          exchangeSize: z.string().optional(),
        }),
      },
    },
    async (request, reply) => {
      const { orderNumber } = request.params;
      const { type, orderItemId, reason, detailedNotes, exchangeSize } = request.body;
      const db = getDbClient();

      const [order] = await db
        .select()
        .from(orders)
        .where(eq(orders.orderNumber, orderNumber.trim().toUpperCase()))
        .limit(1);

      if (!order) {
        throw new NotFoundError('Order not found');
      }

      // Eligible stages: shipped, delivered (or processing/confirmed if patron needs modification)
      if (order.status === 'cancelled') {
        throw new BadRequestError('Cannot initiate exchange or return on a cancelled commission');
      }

      const [item] = await db
        .select()
        .from(orderItems)
        .where(and(eq(orderItems.id, orderItemId), eq(orderItems.orderId, order.id)))
        .limit(1);

      if (!item) {
        throw new NotFoundError('Specified garment item was not found in this order commission');
      }

      // Check if ticket already exists for this item
      const [existingTicket] = await db
        .select()
        .from(returnsAndRefunds)
        .where(and(eq(returnsAndRefunds.orderId, order.id), eq(returnsAndRefunds.orderItemId, item.id)))
        .limit(1);

      if (existingTicket && existingTicket.status !== 'rejected') {
        throw new BadRequestError('An active return or exchange request is already on record for this garment item.');
      }

      const formattedNotes = `[${type.toUpperCase()}${exchangeSize ? ` | Desired Size: ${exchangeSize.trim()}` : ''}] ${detailedNotes ? detailedNotes.trim() : ''}`.trim();

      const [ticket] = await db
        .insert(returnsAndRefunds)
        .values({
          orderId: order.id,
          orderItemId: item.id,
          reason,
          detailedNotes: formattedNotes,
          status: 'requested',
          refundAmountPaise: item.totalPricePaise,
        })
        .returning();

      if (!ticket) {
        throw new Error('Failed to record return ticket in database');
      }

      return reply.status(201).send({
        success: true,
        data: {
          ticketId: ticket.id,
          type,
          status: ticket.status,
          refundAmountPaise: ticket.refundAmountPaise,
          message:
            type === 'exchange'
              ? `Exchange request filed for ${item.productTitle}. Our concierge will arrange complimentary reverse pickup.`
              : `Return request filed for ${item.productTitle}. A refund of ₹${(item.totalPricePaise / 100).toLocaleString('en-IN')} will be issued upon inspection.`,
        },
      });
    }
  );
};
