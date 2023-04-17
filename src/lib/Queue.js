const Queue = require('bull')
const { redisConfig } = require('../database/redisconfig')

const jobs = require('../jobs')

const queues = Object.values(jobs).map((job) => ({
  bull: new Queue(job.key, { redis: redisConfig }),
  name: job.key,
  handle: job.handle,
  options: job.options
}))

module.exports = {
  queues,
  add(name, data) {
    const queue = this.queues.find((queue) => queue.name === name)

    return queue.bull.add(data, queue.options)
  },
  process() {
    return this.queues.forEach((queue) => {
      queue.bull.process(queue.handle)

      queue.bull.on('failed', (job) => {
        console.log('Job failed', queue.key, job.data)
      })
    })
  }
}
