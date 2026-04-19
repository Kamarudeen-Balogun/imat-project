type RateLimitEntry = {
  count: number;
  windowStart: number;
};

type RateLimitResult = {
  allowed: boolean;
  retryAfterSeconds: number;
};

const buckets = new Map<string, RateLimitEntry>();

async function enforceUpstashRateLimit(
  key: string,
  maxRequests: number,
  windowMs: number
): Promise<RateLimitResult | null> {
  const baseUrl = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!baseUrl || !token) {
    return null;
  }

  const ttlSeconds = Math.max(1, Math.ceil(windowMs / 1000));

  const incrResponse = await fetch(`${baseUrl}/incr/${encodeURIComponent(key)}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    cache: "no-store",
  });

  if (!incrResponse.ok) {
    throw new Error(`Upstash INCR failed with status ${incrResponse.status}`);
  }

  const incrJson = (await incrResponse.json()) as { result?: number };
  const count = Number(incrJson.result ?? 0);

  if (count === 1) {
    const expireResponse = await fetch(`${baseUrl}/expire/${encodeURIComponent(key)}/${ttlSeconds}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
    });

    if (!expireResponse.ok) {
      throw new Error(`Upstash EXPIRE failed with status ${expireResponse.status}`);
    }
  }

  if (count <= maxRequests) {
    return { allowed: true, retryAfterSeconds: 0 };
  }

  const ttlResponse = await fetch(`${baseUrl}/ttl/${encodeURIComponent(key)}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    cache: "no-store",
  });

  if (!ttlResponse.ok) {
    return { allowed: false, retryAfterSeconds: ttlSeconds };
  }

  const ttlJson = (await ttlResponse.json()) as { result?: number };
  const ttl = Number(ttlJson.result ?? ttlSeconds);
  return {
    allowed: false,
    retryAfterSeconds: Math.max(1, ttl > 0 ? ttl : ttlSeconds),
  };
}

function enforceInMemoryRateLimit(
  key: string,
  maxRequests: number,
  windowMs: number
): RateLimitResult {
  const now = Date.now();
  const existing = buckets.get(key);

  if (!existing || now - existing.windowStart > windowMs) {
    buckets.set(key, { count: 1, windowStart: now });
    return { allowed: true, retryAfterSeconds: 0 };
  }

  if (existing.count >= maxRequests) {
    const retryAfterMs = windowMs - (now - existing.windowStart);
    return {
      allowed: false,
      retryAfterSeconds: Math.max(1, Math.ceil(retryAfterMs / 1000)),
    };
  }

  existing.count += 1;
  buckets.set(key, existing);
  return { allowed: true, retryAfterSeconds: 0 };
}

export async function enforceRateLimit(
  key: string,
  maxRequests: number,
  windowMs: number
): Promise<RateLimitResult> {
  try {
    const distributedResult = await enforceUpstashRateLimit(key, maxRequests, windowMs);
    if (distributedResult) {
      return distributedResult;
    }
  } catch (error) {
    console.error("Distributed rate limit failed, falling back to in-memory limiter", error);
  }

  return enforceInMemoryRateLimit(key, maxRequests, windowMs);
}
