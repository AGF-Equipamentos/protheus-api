module.exports = {
  user: process.env.PROTHEUS_USER,
  password: process.env.PROTHEUS_PASSWORD,
  server: process.env.PROTHEUS_SERVER,
  database: process.env.PROTHEUS_DATABASE,
  requestTimeout: 1000 * 60 * 5 // 5  minutes
}
