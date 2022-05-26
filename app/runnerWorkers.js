const Queue = require('bull');
const cluster = require('cluster');
const RunnerWorker = require("../lib/RunnerWorker");
const logger = require("../lib/Logger");

const ethers = require("ethers");
const AccountsDbClient = require("../lib/AccountsDbClient");

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
    throw err;
  })
  cluster.on("message", message => {
    logger.info(message);
  })
  cluster.on('exit', function (worker, code, signal) {
    logger.error('worker ' + worker.process.pid + ' died');
  });
} else {
  taskQueue.process(async function (job, jobDone) {
    const runnerWorker = new RunnerWorker();
    runnerWorker.on("error", err => {
      logger.error(err);
    })
    runnerWorker.on("info", message => {
      logger.info(message);
    });
    await runnerWorker.process(job.data);
    jobDone();
  });
}