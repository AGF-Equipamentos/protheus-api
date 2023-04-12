const { redisClient } = require('../../database/redisconfig')

async function getRedis(query) {
  const redisResponseParsed = await redisClient.get(JSON.stringify(query))

  if (redisResponseParsed) {
    const redisResponse = JSON.parse(redisResponseParsed)

    return redisResponse
  }
}

module.exports = { getRedis }
