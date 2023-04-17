const { Redis } = require('ioredis')

const redisConfig = {
  port: process.env.REDIS_PORT || 6379,
  host: process.env.REDIS_HOST || 'localhost'
}

const redisClient = new Redis(redisConfig)

module.exports = { redisClient, redisConfig }
