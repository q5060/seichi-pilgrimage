import { createClient, type RedisClientType } from "redis";

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

const memoryStore = new Map<string, CacheEntry<unknown>>();

let redisClient: RedisClientType | null = null;
let redisInit: Promise<RedisClientType | null> | null = null;

const KEY_PREFIX = "seichi:cache:";
const REDIS_CONNECT_TIMEOUT_MS = 2000;

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("redis connect timeout")), ms);
    promise
      .then((v) => {
        clearTimeout(timer);
        resolve(v);
      })
      .catch((err) => {
        clearTimeout(timer);
        reject(err);
      });
  });
}

async function getRedis(): Promise<RedisClientType | null> {
  const url = process.env.REDIS_URL;
  if (!url) return null;

  // Skip Redis during production static generation to avoid build hangs
  if (process.env.NEXT_PHASE === "phase-production-build") return null;

  if (redisClient?.isOpen) return redisClient;

  if (!redisInit) {
    redisInit = (async () => {
      try {
        const client = createClient({
          url,
          socket: {
            connectTimeout: REDIS_CONNECT_TIMEOUT_MS,
            reconnectStrategy: false,
          },
        });
        client.on("error", (err) => console.error("[redis]", err));
        await withTimeout(client.connect(), REDIS_CONNECT_TIMEOUT_MS);
        redisClient = client;
        return client;
      } catch (err) {
        console.error("[redis] connect failed:", err);
        redisInit = null;
        return null;
      }
    })();
  }

  return redisInit;
}

export async function cacheGet<T>(key: string): Promise<T | null> {
  const redis = await getRedis();
  if (redis) {
    try {
      const raw = await redis.get(`${KEY_PREFIX}${key}`);
      if (raw) return JSON.parse(raw) as T;
    } catch (err) {
      console.error("[redis] get failed:", err);
    }
    return null;
  }

  const entry = memoryStore.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    memoryStore.delete(key);
    return null;
  }
  return entry.value as T;
}

export async function cacheSet<T>(
  key: string,
  value: T,
  ttlMs = 5 * 60 * 1000
): Promise<void> {
  const redis = await getRedis();
  if (redis) {
    try {
      await redis.set(`${KEY_PREFIX}${key}`, JSON.stringify(value), {
        PX: ttlMs,
      });
      return;
    } catch (err) {
      console.error("[redis] set failed:", err);
    }
  }

  memoryStore.set(key, { value, expiresAt: Date.now() + ttlMs });
}

export async function cacheFetch<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttlMs = 5 * 60 * 1000
): Promise<T> {
  const cached = await cacheGet<T>(key);
  if (cached !== null) return cached;
  const value = await fetcher();
  await cacheSet(key, value, ttlMs);
  return value;
}

export async function cacheDelete(key: string): Promise<void> {
  const redis = await getRedis();
  if (redis) {
    try {
      await redis.del(`${KEY_PREFIX}${key}`);
    } catch {
      // ignore
    }
  }
  memoryStore.delete(key);
}
