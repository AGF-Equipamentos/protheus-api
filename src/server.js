require('dotenv').config()
const express = require('express')
const cors = require('cors')
const routes = require('./routes')

const { createBullBoard } = require('@bull-board/api')
const Queue = require('./lib/Queue')
const { ExpressAdapter } = require('@bull-board/express')
const { BullAdapter } = require('@bull-board/api/bullAdapter')

require('./database')

const app = express()

// Bull Dashboard
const serverAdapter = new ExpressAdapter()
serverAdapter.setBasePath('/admin/queues')
createBullBoard({
  queues: Queue.queues.map((queue) => new BullAdapter(queue.bull)),
  serverAdapter: serverAdapter
})
app.use('/admin/queues', serverAdapter.getRouter())

app.use(cors())
app.use(express.json())
app.use(routes)

app.listen(process.env.PORT)
