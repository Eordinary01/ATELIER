import { FastifyPluginAsync } from 'fastify';
import {
  getDbClient,
  orders,
  orderItems,
  payments,
  addresses,
  eq,
} from '@atelier/database';
import { verifyRazorpayWebhookSignature } from '../services/razorpay.js';
import { commitStockHold, releaseStockHold } from '../services/stockReservation.js';
import { sendOrderConfirmationEmail } from '../services/email.js';

export const webhookRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.post('/webhook', async (request, reply) => {
    const signature = request.headers['x-razorpay-signature'] as string | undefined;
    const rawBody = (request as any).rawBody || JSON.stringify(request.body);

    // 1. Verify Webhook Signature
    if (!signature || !verifyRazorpayWebhookSignature({ rawBody, signature })) {
      fastify.log.warn('Rejected webhook: invalid or missing signature');
      return reply.status(400).send({
        success: false,
        error: { code: 'INVALID_SIGNATURE', message: 'Razorpay webhook signature verification failed' },
      });
    }

    const payload = request.body as any;
    const event = payload?.event;
    fastify.log.info({ event }, 'Received verified Razorpay webhook event');

    const db = getDbClient();

    // 2. Handle payment.captured or order.paid
    if (event === 'payment.captured' || event === 'order.paid') {
      const paymentEntity = payload?.payload?.payment?.entity;
      const razorpayOrderId = paymentEntity?.order_id || payload?.payload?.order?.entity?.id;
      const paymentId = paymentEntity?.id;
      const receipt = payload?.payload?.order?.entity?.receipt;

      let orderId: string | null = null;

      // Look up by payment record or receipt
      if (razorpayOrderId) {
        const paymentRow = await db
          .select({ orderId: payments.orderId })
          .from(payments)
          .where(eq(payments.gatewayOrderId, razorpayOrderId))
          .limit(1);

        if (paymentRow.length > 0 && paymentRow[0]?.orderId) {
          orderId = paymentRow[0].orderId;
        }
      }

      if (!orderId && receipt) {
        const orderRow = await db
          .select({ id: orders.id })
          .from(orders)
          .where(eq(orders.orderNumber, receipt))
          .limit(1);

        if (orderRow.length > 0 && orderRow[0]?.id) {
          orderId = orderRow[0].id;
        }
      }

      if (!orderId) {
        fastify.log.warn({ razorpayOrderId, receipt }, 'Order not found for webhook');
        return reply.status(200).send({ received: true, note: 'Order not found' });
      }

      // Look up existing order
      const orderRows = await db
        .select()
        .from(orders)
        .where(eq(orders.id, orderId))
        .limit(1);

      if (orderRows.length === 0 || !orderRows[0]) {
        return reply.status(200).send({ received: true, note: 'Order not found' });
      }

      const order = orderRows[0];

      // IDEMPOTENCY CHECK: If already confirmed or further, don't duplicate processing
      if (order.status !== 'pending_payment') {
        fastify.log.info(
          { orderId: order.id, status: order.status },
          'Webhook idempotency: order already processed'
        );
        return reply.status(200).send({ received: true, alreadyProcessed: true });
      }

      // Fetch line items for stock commit
      const items = await db
        .select({ variantId: orderItems.variantId, quantity: orderItems.quantity })
        .from(orderItems)
        .where(eq(orderItems.orderId, order.id));

      // Commit stock hold
      await commitStockHold(order.id, items);

      // Transition order status to CONFIRMED
      await db
        .update(orders)
        .set({
          status: 'confirmed',
          paymentStatus: 'captured',
          updatedAt: new Date(),
        })
        .where(eq(orders.id, order.id));

      // Update payment record
      await db
        .update(payments)
        .set({
          gatewayPaymentId: paymentId || `pay_wh_${Date.now()}`,
          status: 'captured',
          rawResponse: paymentEntity || payload,
          updatedAt: new Date(),
        })
        .where(eq(payments.orderId, order.id));

      // Fetch shipping address for email
      const shipAddrRows = await db
        .select()
        .from(addresses)
        .where(eq(addresses.id, order.shippingAddressId))
        .limit(1);

      const shipAddr = shipAddrRows[0];

      // Dispatch Brevo Order Confirmation Email
      if (shipAddr) {
        sendOrderConfirmationEmail({
          orderNumber: order.orderNumber,
          customerName: shipAddr.name,
          customerEmail: order.guestEmail || 'patron@atelier.in',
          totalPaise: order.totalPaise,
          items: items.map((i) => ({
            title: 'Archival Silhouette',
            size: 'Bespoke',
            color: 'Original',
            quantity: i.quantity,
            pricePaise: order.totalPaise,
          })),
          shippingAddress: `${shipAddr.name}, ${shipAddr.addressLine1}, ${shipAddr.city}, ${shipAddr.state} - ${shipAddr.postalCode}`,
        }).catch((err) => {
          fastify.log.warn({ err }, 'Failed to send confirmation email from webhook');
        });
      }


      return reply.status(200).send({
        received: true,
        orderId: order.id,
        status: 'confirmed',
      });
    }

    // 3. Handle payment.failed
    if (event === 'payment.failed') {
      const paymentEntity = payload?.payload?.payment?.entity;
      const razorpayOrderId = paymentEntity?.order_id;

      if (razorpayOrderId) {
        const paymentRow = await db
          .select({ orderId: payments.orderId })
          .from(payments)
          .where(eq(payments.gatewayOrderId, razorpayOrderId))
          .limit(1);

        if (paymentRow.length > 0 && paymentRow[0]?.orderId) {
          const orderRows = await db
            .select()
            .from(orders)
            .where(eq(orders.id, paymentRow[0].orderId))
            .limit(1);

          if (orderRows.length > 0 && orderRows[0]?.status === 'pending_payment') {
            const order = orderRows[0];
            const items = await db
              .select({ variantId: orderItems.variantId, quantity: orderItems.quantity })
              .from(orderItems)
              .where(eq(orderItems.orderId, order.id));

            // Release stock hold
            await releaseStockHold(order.id, items);

            // Update order status
            await db
              .update(orders)
              .set({
                status: 'cancelled',
                paymentStatus: 'failed',
                updatedAt: new Date(),
              })
              .where(eq(orders.id, order.id));

            return reply.status(200).send({
              received: true,
              orderId: order.id,
              status: 'cancelled',
            });
          }
        }
      }

      return reply.status(200).send({ received: true });
    }

    // Acknowledge unhandled events
    return reply.status(200).send({ received: true, ignored: true });
  });
};
