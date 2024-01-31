require('dotenv').config()
const Sentry = require('@sentry/node')
const { ProfilingIntegration } = require('@sentry/profiling-node')
const express = require('express')
const cors = require('cors')
const routes = require('./routes')

const { createBullBoard } = require('@bull-board/api')
const Queue = require('./lib/Queue')
const { ExpressAdapter } = require('@bull-board/express')
const { BullAdapter } = require('@bull-board/api/bullAdapter')

require('./database')

const app = express()

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  integrations: [
    // enable HTTP calls tracing
    new Sentry.Integrations.Http({ tracing: true }),
    // enable Express.js middleware tracing
    new Sentry.Integrations.Express({ app }),
    new ProfilingIntegration()
  ],
  // Performance Monitoring
  tracesSampleRate: 1.0, //  Capture 100% of the transactions
  // Set sampling rate for profiling - this is relative to tracesSampleRate
  profilesSampleRate: 1.0
})

app.use(Sentry.Handlers.requestHandler())
app.use(Sentry.Handlers.tracingHandler())

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

app.use(Sentry.Handlers.errorHandler())

app.listen(process.env.PORT)
