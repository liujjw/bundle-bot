const Runner = require("../lib/Runner");

/**
 * Assumes started as a child process.
 */
async function main() {
  const runner = new Runner();
  runner.on("error", err => {
    process.send(err);
  })
  runner.on("info", message => {
    process.send(message);
  });
}

main().catch((e) => {
  process.send(e);
});

