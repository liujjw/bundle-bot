const RunnerWorker = require("../lib/RunnerWorker");
const logger = require("../lib/Logger");

module.exports = async function (job) {
  const runnerWorker = new RunnerWorker();
  runnerWorker.on("error", err => {
    logger.error(err);
  })
  runnerWorker.on("info", message => {
    logger.info(message);
  });
  await runnerWorker.process(job.data);
  return Promise.resolve(result);
}