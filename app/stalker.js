const fetch = require("node-fetch");
const Web3 = require("web3");
const net = require("net");
const { ADDRS, PARAMS } = require("../lib/Constants");
const schedule = require("node-schedule");
const bodyParser = require("body-parser");
const express = require("express");
const seenHashes = [];
const firstSeen = new Map();
// TODO stalk base fee/price drops so that previously unprofitable
// positions now are profitable

/**
 * @notice DO NOT AWAIT FETCH
 * @param {*} tx 
 * @param {*} from
 */
function send(tx, from) {  
  if (seenHashes.includes(tx.hash)) return;
  seenHashes.push(tx.hash);
  firstSeen.set(tx.hash, from);
  if (seenHashes.length > 100) {
    console.log(firstSeen);
    seenHashes = [];
  }

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
 * Reverse proxy to Runner for ngrok forwarding.
 */
function server() {
  // TODO use blocknative as a fallback provider or complement with a seenHashes array
  // 1) install ngrok node wrapper, start ngrok, take note of forwarding address
  // 2) use forwarding address as blocknative webhook address
  // 3) add code to use as fallback when local node subscribe fails
  const app = express();
  app.use(bodyParser.json());
  app.post("/", async (req, res) => {
    const tx = req.body;
    if (tx.status === "pending") {
      send(tx);
    }
    res.send("ok");
  });
  app.listen(Number.parseInt(process.env.BLOCKNATIVE_RP_PORT), () => {
    console.log("blocknative listening on", process.env.BLOCKNATIVE_RP_PORT);
  });
}

/**
 * 
 * @param {*} web3 
 * @param {*} from 
 */
async function subscribe(web3, from) {
  web3.eth
    .subscribe("pendingTransactions", (error, result) => {
      if (error) {
        console.error(new Error("could not subscribe to tx pool"));
      }
    })
    .on("data", async function (txHash) {
      const tx = await web3.eth.getTransaction(txHash);
      if (tx === null) return;
      send(tx, from);
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

const web3IPC = new Web3(
  new Web3.providers.IpcProvider(process.env.IPC_PROVIDER_ENDPOINT, net)
);
subscribe(web3IPC, "ipc").then().catch(err => process.send(err));

const web3Chainstack = new Web3(
  new Web3.providers.WebsocketProvider(
    "wss://ws-nd-032-574-945.p2pify.com/704be0327c206b1ccab62eb791083a0a"
  )
);
subscribe(web3Chainstack, "chainstack").then().catch(err => process.send(err));

