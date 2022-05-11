const Queue = require('bull');
const cluster = require('cluster');
const RunnerWorker = require("../lib/RunnerWorker");
const ethers = require("ethers");
const AccountsDbClient = require("../lib/AccountsDbClient");

require("dotenv").config({ path: __dirname + "/../.env" });

const numWorkers = process.env.NUM_WORKERS;
const taskQueue = new Queue("Task queue", process.env.REDIS_ENDPOINT, {
  redis: {
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
    process.send(message);
  })
  cluster.on('exit', function (worker, code, signal) {
    process.send('worker ' + worker.process.pid + ' died');
  });
} else {
  taskQueue.process(async function (job, jobDone) {
    if (await this.getActiveCount() === 0) {
      const signer = new ethers.Wallet(process.env.MM0A_PK, 
        new ethers.providers.JsonRpcProvider(process.env.PROVIDER_ENDPOINT));
      const nonce = (await signer.getTransactionCount()) + 1;
      const store = new AccountsDbClient({
        host: process.env.REDIS_HOST,
        port: process.env.REDIS_PORT,
        database: Number.parseInt(process.env.DB_NUMBER_FOR_DATA)
      });
      await store.init();
      await store.setNonce(nonce);
    }
    const runnerWorker = new RunnerWorker();
    runnerWorker.on("error", err => {
      process.send(err);
    })
    runnerWorker.on("info", message => {
      process.send(message);
    });
    await runnerWorker.process(job.data);
    jobDone();
  });
}