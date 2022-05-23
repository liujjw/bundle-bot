const fetch = require("node-fetch");
const Web3 = require("web3");
const net = require("net");
const { ADDRS, PARAMS } = require("../lib/Constants");
const schedule = require("node-schedule");
const bodyParser = require("body-parser");
const express = require("express");

// TODO stalk base fee/price drops so that previously unprofitable
// positions now are profitable

/**
 * @notice DO NOT AWAIT FETCH
 * @param {*} tx 
 */
function send(tx) {
  if (Object.values(ADDRS.OFFCHAIN_AGG).includes(tx.to)) {
    fetch(`${process.env.RUNNER_ENDPOINT}/priceUpdate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(tx),
    }).catch(e => {
      process.send(e);
    });
  } else if (tx.to === ADDRS["COMPOUND_COMPTROLLER"]) {
    fetch(`${process.env.RUNNER_ENDPOINT}/paramUpdate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(tx),
    }).catch(e => {
      process.send(e)
    });
  }
}

/**
 * 
 */
function server() {
  const app = express();
  app.use(bodyParser.json());
  app.post("/", async (req, res) => {
    const tx = req.body;
    if (tx.status === "pending") {
      send(tx);
    }
    res.send("ok");
  });
  app.listen(Number.parseInt(process.env.BLOCKNATIVE_RP_PORT), () => {});
}

/**
 * 
 */
async function subscribe() {
  const web3 = new Web3(
    new Web3.providers.IpcProvider(process.env.IPC_PROVIDER_ENDPOINT, net)
  );

  web3.eth
    .subscribe("pendingTransactions", (error, result) => {
      if (error) {
        throw new Error("could not subscribe to tx pool");
      }
    })
    .on("data", async function (txHash) {
      const tx = await web3.eth.getTransaction(txHash);
      if (tx === null) return;
      send(tx);
    });
}

/**
 * 
 */
async function check() {
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

check().then();
subscribe().then().catch(err => process.send(err));
server();