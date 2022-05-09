const { fork } = require("child_process");
const { ethers } = require("ethers");
const schedule = require("node-schedule");

const { sleep } = require("../lib/Utils");
const AccountsDbClient = require("../lib/AccountsDbClient");
const { PARAMS } = require("../lib/Constants");
const { createLogger, format, transports } = require("winston");
const logger = createLogger({
  level: "info",
  format: format.combine(
    format.timestamp({
      format: "YYYY-MM-DD HH:mm:ss",
    }),
    format.errors({ stack: true }),
    format.splat(),
    format.json()
  ),

  transports: [
    new transports.File({ filename: "../logs/error.log", level: "error" }),
    new transports.File({ filename: "../logs/combined.log" }),
  ],
});

// if (process.env.NODE_ENV !== "production") {
  logger.add(
    new transports.Console({
      format: format.combine(format.colorize(), format.simple()),
    })
  );
// }

/**
 * Starts a cluster of services. 
 */
async function main() {
  const provider = new ethers.providers.JsonRpcProvider(
    process.env.PROVIDER_ENDPOINT
  );
  const db = {
    host: process.env.REDIS_HOST,
    port: process.env.REDIS_PORT,
    database: process.env.DB_NUMBER_FOR_DATA
  };
  const store = new AccountsDbClient(db, provider);
  await store.init();

  const paramJob = schedule.scheduleJob(PARAMS.DB_UPDATE_PARAMS_SCHEDULE, 
    async function() {
      try {
        await store.setCompoundParams();
      } catch (e) {
        this.emit("error", e);
      }
  });
  paramJob.on("error", (e) => {
    logger.error(`error updating db params with error ${e}`);
  });
  const accJob = schedule.scheduleJob(PARAMS.DB_UPDATE_ACCOUNTS_SCHEDULE, 
    async function() {
      try {
        await store.setCompoundAccounts();
      } catch (e) {
        this.emit("error", e);
      }
  });
  accJob.on("error", (e) => {
    logger.error(`erorr updating db with error ${e}`);
  });

  if (process.env.DB_READY === "false") {
    await sleep(PARAMS.WAIT_TIME_FOR_DB_TO_INIT_MS);
  }

  const runnerFilename = "runner.js";
  const runner = fork(__dirname + `/${runnerFilename}`);
  runner.on("spawn", () => {
    logger.info(`started ${runnerFilename}`);
  })
  runner.on("error", (err) => {
    logger.error(err);
  });
  runner.on("message", (message, sendHandle) => {
    logger.info(JSON.stringify(message, null, 4));
  })

  const stalkerFilename = "stalker.js";
  const stalker = fork(__dirname + `/${stalkerFilename}`);
  stalker.on("spawn", () => {
    logger.info(`started ${stalkerFilename}`);
  })
  stalker.on("error", (err) => {
    logger.error(err);
  });
  stalker.on("message", (message, sendHandle) => {
    logger.info(JSON.stringify(message, null, 4));
  });

  const workersFilename = "runnerWorkers.js";
  const workers = fork(__dirname + `/${workersFilename}`);
  workers.on("spawn", () => {
    logger.info(`started ${workersFilename}`);
  })
  workers.on("message", (message) => {
    logger.info(JSON.stringify(message, null, 4));
  })

  const bullBoardFilename = "bullBoard.js";
  const bullBoard = fork(__dirname + `/${bullBoardFilename}`);
  bullBoard.on("message", (message) => {
    logger.info(message);
  });

  process.on('SIGINT', function () { 
    schedule.gracefulShutdown()
    .then(() => process.exit(0))
  });
}

logger.info(`started ${__filename} ${process.pid}`);
main().catch((e) => {
  logger.error(`uncaught error in main ${e}`);
});
