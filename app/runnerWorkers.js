const Queue = require('bull');
const cluster = require('cluster');
const logger = require("../lib/Logger");

require("dotenv").config({ path: __dirname + "/../.env" });

const numWorkers = process.env.NUM_WORKERS;
const taskQueue = new Queue("Task queue", {
  redis: {
    host: process.env.REDIS_HOST,
    port: process.env.REDIS_PORT,
    db: Number.parseInt(process.env.DB_NUMBER_FOR_JOBS)
  }
});

if (cluster.isMaster) {
  for (let i = 0; i < numWorkers; i++) {
    cluster.fork();
  }

  cluster.on("error", err => {
    logger.error(`uncaught cluster error ${err}`);
  })
  cluster.on('exit', function (worker, code, signal) {
    logger.error('worker ' + worker.process.pid + ' died');
  });
} else {
  taskQueue.process("/root/defi-bot/app/runnerWorkersProcessor.js");
}