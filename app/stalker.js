const fetch = require("node-fetch");
const Web3 = require("web3");
const net = require("net");
const { ADDRS, PARAMS } = require("../lib/Constants");
const schedule = require("node-schedule");

const web3 = new Web3(
  new Web3.providers.IpcProvider(process.env.IPC_PROVIDER_ENDPOINT, net)
);

// TODO stalk base fee/price drops so that previously unprofitable
// positions now are profitable

/**
 * @notice DO NOT await fetch calls
 */
async function main() {
  web3.eth
    .subscribe("pendingTransactions", (error, result) => {
      if (error) {
        throw new Error("could not subscribe to tx pool");
      }
    })
    .on("data", async function (txHash) {
      const tx = await web3.eth.getTransaction(txHash);
      if (tx === null) return;
      
      if (Object.values(ADDRS.OFFCHAIN_AGG).includes(tx.to)) {
        process.send("found a price update to backrun sent to offchain agg");
        fetch(`${process.env.RUNNER_ENDPOINT}/priceUpdate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(tx),
        }).catch(e => {
          process.send(e);
        });
      } else if (tx.to === ADDRS["COMPOUND_COMPTROLLER"]) {
        process.send("found a param update to backrun sent to comptroller");
        fetch(`${process.env.RUNNER_ENDPOINT}/paramUpdate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(tx),
        }).catch(e => {
          process.send(e)
        });
      }
    });

    const checkJob = schedule.scheduleJob(PARAMS.CHECK_SCHEDULE, 
      async function() {
        fetch(`${process.env.RUNNER_ENDPOINT}/check`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: "",
        }).catch(e => {
          process.send(e);
        });
      }
    );
    checkJob.on("error", (e) => {
      process.send(`erorr checking with ${e}`);
    });
}

main().then().catch(err => process.send(err));
