import { Redis } from 'ioredis';
import { env } from '../config/env.js';

let redisClient: Redis | null = null;
let isRedisAvailable = false;

// Fallback in-memory session map if Redis is temporarily unreachable in dev
const devMemoryStore = new Map<string, { data: string; expiresAt: number }>();

export function isRedisReady(): boolean {
  return isRedisAvailable;
}

export function getRedisClient(): Redis {
  if (!redisClient) {
    redisClient = new Redis(env.REDIS_URL, {
      lazyConnect: true,
      maxRetriesPerRequest: 1,
      retryStrategy(times) {
        if (times > 3) return null;
        return Math.min(times * 100, 1000);
      },
    });

    redisClient.on('connect', () => {
      isRedisAvailable = true;
    });

    redisClient.on('error', () => {
      isRedisAvailable = false;
    });
  }

  return redisClient;
}

export async function pingRedis(): Promise<boolean> {
  try {
    const client = getRedisClient();
    if (client.status === 'wait') {
      await client.connect();
    }
    const res = await client.ping();
    return res === 'PONG';
  } catch {
    return false;
  }
}

export interface SessionPayload {
  userId: string;
  role: string;
  email: string;
  createdAt: string;
}

export async function saveSession(
  sessionId: string,
  payload: SessionPayload,
  ttlSeconds: number
): Promise<void> {
  const serialized = JSON.stringify(payload);
  const key = `session:${sessionId}`;

  try {
    const client = getRedisClient();
    if (client.status === 'wait') {
      await client.connect();
    }
    await client.set(key, serialized, 'EX', ttlSeconds);
  } catch {
    // In-memory fallback
    devMemoryStore.set(key, {
      data: serialized,
      expiresAt: Date.now() + ttlSeconds * 1000,
    });
  }
}

export async function getSession(sessionId: string): Promise<SessionPayload | null> {
  const key = `session:${sessionId}`;

  try {
    const client = getRedisClient();
    if (client.status === 'wait') {
      await client.connect();
    }
    const raw = await client.get(key);
    if (!raw) return null;
    return JSON.parse(raw) as SessionPayload;
  } catch {
    // In-memory fallback check
    const entry = devMemoryStore.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      devMemoryStore.delete(key);
      return null;
    }
    return JSON.parse(entry.data) as SessionPayload;
  }
}

export async function deleteSession(sessionId: string): Promise<void> {
  const key = `session:${sessionId}`;
  try {
    const client = getRedisClient();
    if (client.status === 'wait') {
      await client.connect();
    }
    await client.del(key);
  } catch {
    devMemoryStore.delete(key);
  }
}
