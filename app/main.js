const { fork } = require("child_process");
const { ethers } = require("ethers");
const schedule = require("node-schedule");

const { sleep } = require("../lib/Utils");
const AccountsDbClient = require("../lib/AccountsDbClient");
const { PARAMS } = require("../lib/Constants");
const logger = require("../lib/Logger");

/**
 * Starts a cluster of services. 
 */
async function main() {
  const provider = new ethers.providers.JsonRpcProvider(
    process.env.PROVIDER_ENDPOINT
  );

  const db = {
    host: process.env.REDIS_HOST,
    port: Number.parseInt(process.env.REDIS_PORT),
    database: process.env.DB_NUMBER_FOR_DATA
  };
  const store = new AccountsDbClient(db, provider);
  await store.init();
  await store.setNonce(0);
  
  const paramJob = schedule.scheduleJob(PARAMS.DB_UPDATE_PARAMS_SCHEDULE, 
    async function() {
      try {
        await store.setCompoundParams();
      } catch (e) {
        logger.warn(`problem updating db params ${e}`);
      }
  });
  const accJob = schedule.scheduleJob(PARAMS.DB_UPDATE_ACCOUNTS_SCHEDULE, 
    async function() {
      try {
        await store.setCompoundAccounts();
      } catch (e) {
        logger.warn(`problem updating db ${e}`);
      }
  });

  if (process.env.DB_READY === "false") {
    await sleep(PARAMS.WAIT_TIME_FOR_DB_TO_INIT_MS);
  }

  const runnerFilename = "runner.js";
  const runner = fork(__dirname + `/${runnerFilename}`);
  runner.on("spawn", () => {
    logger.info(`started ${runnerFilename}`);
  });

  const stalkerFilename = "stalker.js";
  const stalker = fork(__dirname + `/${stalkerFilename}`);
  stalker.on("spawn", () => {
    logger.info(`started ${stalkerFilename}`);
  });

  const workersFilename = "runnerWorkers.js";
  const workers = fork(__dirname + `/${workersFilename}`);
  workers.on("spawn", () => {
    logger.info(`started ${workersFilename}`);
  });

  const bullBoardFilename = "bullBoard.js";
  const bullBoard = fork(__dirname + `/${bullBoardFilename}`);
  bullBoard.on("spawn", () => {
    logger.info(`started ${bullBoardFilename}`);
  });

  process.on('SIGINT', function () { 
    schedule.gracefulShutdown()
    .then(() => process.exit(0))
  });
}

logger.info(`started ${__filename} w/ pid ${process.pid}`);
main().catch((e) => {
  logger.error(`uncaught error in main ${e}`);
});
