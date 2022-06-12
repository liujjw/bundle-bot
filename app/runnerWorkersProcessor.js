const RunnerWorker = require("../lib/RunnerWorker");

module.exports = async function (job) {
  const runnerWorker = new RunnerWorker();
  await runnerWorker.process(job.data);
  return Promise.resolve(result);
}