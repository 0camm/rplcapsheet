const { Redis } = require('@upstash/redis');

let client = null;
function getRedis() {
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    throw new Error('Server not configured: set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN in Vercel env vars.');
  }
  if (!client) client = Redis.fromEnv();
  return client;
}

module.exports = { getRedis };
