const Runner = require("../lib/Runner");

/**
 * Assumes started as a child process.
 */
async function main() {
  const runner = new Runner();
}

main().catch((e) => {
  logger.error(e);
});

