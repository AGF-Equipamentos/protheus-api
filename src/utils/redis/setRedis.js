const { redisClient } = require('../../database/redisconfig')

async function setRedis(query, data, expires_in) {
  await redisClient.set(
    `protheus-api:${JSON.stringify(query)}`,
    JSON.stringify(data),
    'EX',
    expires_in
  )
}

module.exports = { setRedis }
