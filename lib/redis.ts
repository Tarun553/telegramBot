import { Redis } from "@upstash/redis";

/**
 * Using @upstash/redis (REST) instead of ioredis (TCP) 
 * This is the recommended SDK for Next.js/Serverless to avoid ECONNRESET.
 */
const redisClient = () => {
    if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
        console.warn("[Redis] Credentials missing in .env. Caching will be disabled.");
        return null;
    }

    return new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
    });
};

const globalForRedis = global as unknown as {
    redisRest: Redis | null;
};

export const redis = globalForRedis.redisRest || redisClient();

if (process.env.NODE_ENV !== "production") globalForRedis.redisRest = redis;

export default redis;
