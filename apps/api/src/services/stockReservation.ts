import {
  getDbClient,
  inventory,
  stockReservations,
  eq,
  and,
  sql,
} from '@atelier/database';
import { getRedisClient } from '../lib/redis.js';
import { BadRequestError } from '../lib/errors.js';

const HOLD_TTL_SECONDS = 900; // 15 minutes hold window

export interface ReservationItem {
  variantId: string;
  quantity: number;
}

/**
 * Calculates current active holds in Redis for a variant
 */
async function getActiveHoldQuantity(variantId: string): Promise<number> {
  const client = getRedisClient();
  try {
    if (client.status === 'wait') await client.connect();
    const pattern = `stock_hold:${variantId}:*`;
    const keys = await client.keys(pattern);
    if (!keys || keys.length === 0) return 0;

    const values = await client.mget(keys);
    return values.reduce((sum, val) => sum + (val ? parseInt(val, 10) : 0), 0);
  } catch {
    return 0;
  }
}

/**
 * Reserve stock hold for 15 minutes across Redis and PostgreSQL
 */
export async function reserveStockHold(
  orderId: string,
  items: ReservationItem[]
): Promise<void> {
  const db = getDbClient();
  const client = getRedisClient();
  if (client.status === 'wait') {
    await client.connect().catch(() => { });
  }

  // 1. Validate unreserved inventory availability for all items
  for (const item of items) {
    const invRow = await db
      .select({ quantityAvailable: inventory.quantityAvailable })
      .from(inventory)
      .where(eq(inventory.variantId, item.variantId))
      .limit(1);

    if (!invRow || invRow.length === 0) {
      throw new BadRequestError(`Inventory record not found for variant ${item.variantId}`);
    }

    const physicalStock = invRow[0]!.quantityAvailable;
    const activeHolds = await getActiveHoldQuantity(item.variantId);
    const effectiveStock = physicalStock - activeHolds;

    if (effectiveStock < item.quantity) {
      throw new BadRequestError(
        'One or more selected garments are currently held in another commission session. Please select an alternate size or wait 15 minutes.'
      );
    }
  }

  // 2. Commit holds in Redis and PostgreSQL
  const expiresAt = new Date(Date.now() + HOLD_TTL_SECONDS * 1000);

  for (const item of items) {
    const redisKey = `stock_hold:${item.variantId}:${orderId}`;

    // Redis Hold with 15-minute TTL
    try {
      await client.set(redisKey, String(item.quantity), 'EX', HOLD_TTL_SECONDS);
    } catch {
      // In-memory or fallback ignore
    }

    // PostgreSQL Record
    await db.insert(stockReservations).values({
      variantId: item.variantId,
      cartSessionId: orderId,
      quantity: item.quantity,
      expiresAt,
      status: 'active',
    });
  }
}

/**
 * Release active stock holds when an order is cancelled or abandoned
 */
export async function releaseStockHold(
  orderId: string,
  items: ReservationItem[]
): Promise<void> {
  const db = getDbClient();
  const client = getRedisClient();

  for (const item of items) {
    const redisKey = `stock_hold:${item.variantId}:${orderId}`;
    try {
      await client.del(redisKey);
    } catch {
      // Ignore
    }
  }

  await db
    .update(stockReservations)
    .set({ status: 'released' })
    .where(
      and(
        eq(stockReservations.cartSessionId, orderId),
        eq(stockReservations.status, 'active')
      )
    );
}

/**
 * Commit reservation: deducts physical inventory and marks reservation consumed
 */
export async function commitStockHold(
  orderId: string,
  items: ReservationItem[]
): Promise<void> {
  const db = getDbClient();
  const client = getRedisClient();

  // Deduct physical inventory
  for (const item of items) {
    await db
      .update(inventory)
      .set({
        quantityAvailable: sql`GREATEST(0, ${inventory.quantityAvailable} - ${item.quantity})`,
      })
      .where(eq(inventory.variantId, item.variantId));

    // Remove Redis hold
    const redisKey = `stock_hold:${item.variantId}:${orderId}`;
    try {
      await client.del(redisKey);
    } catch {
      // Ignore
    }
  }

  // Mark reservation consumed in DB
  await db
    .update(stockReservations)
    .set({ status: 'consumed' })
    .where(
      and(
        eq(stockReservations.cartSessionId, orderId),
        eq(stockReservations.status, 'active')
      )
    );
}
