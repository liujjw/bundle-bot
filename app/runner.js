const Runner = require("../lib/Runner");

/**
 * Assumes started as a child process.
 */
async function main() {
  const runner = new Runner();
  runner.on("error", err => {
    throw err;
  })
  runner.on("info", message => {
    process.send(message);
  });
}

main().catch((e) => {
  throw e;
});

