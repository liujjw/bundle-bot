const Runner = require("../lib/Runner");
const logger = require("../lib/Logger");

/**
 * Assumes started as a child process.
 */
async function main() {
  const runner = new Runner();
  runner.on("error", err => {
    logger.error(err);
  })
  runner.on("info", message => {
    logger.info(message);
  });
}

main().catch((e) => {
  logger.error(e);
});

