const { Redis } = require('ioredis')

const redisClient = new Redis(
  process.env.REDIS_PORT || 6379,
  process.env.REDIS_HOST || 'localhost'
)

module.exports = { redisClient }
