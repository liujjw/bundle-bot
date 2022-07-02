/* eslint-disable guard-for-in */
const fetch = require("node-fetch");
const Web3 = require("web3");
const net = require("net");
const { ADDRS, PARAMS, ENDPOINTS } = require("../lib/Constants");
const schedule = require("node-schedule");
const bodyParser = require("body-parser");
const express = require("express");
const logger = require("../lib/Logger");
const { providers } = require("ethers");
// let seenHashes = [];

// TODO stalk base fee/price drops so that previously unprofitable
// positions now are profitable

const OFFCHAIN_AGG_LOWERCASE = JSON.parse(JSON.stringify(ADDRS.OFFCHAIN_AGG));
for (const key in OFFCHAIN_AGG_LOWERCASE) {
  OFFCHAIN_AGG_LOWERCASE[key] = OFFCHAIN_AGG_LOWERCASE[key].toLowerCase();
}

/**
 * @notice DO NOT AWAIT FETCH
 * @param {Transaction|undefined} tx 
 * @param {*} source
 * @param {Tranaction|undefined} provider
 */
function send(tx, source, provider) {  
  // if (seenHashes.length > 15) {
  //   seenHashes = [];
  // }
  if (tx === undefined) {    
    fetch(`${process.env.RUNNER_ENDPOINT}/check`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "",
    }).catch(e => {
      logger.error(`cannot run check ${e}`);
    });
  } else {
    if (Object.values(ADDRS.OFFCHAIN_AGG).includes(tx.to) ||
        Object.values(OFFCHAIN_AGG_LOWERCASE).includes(tx.to)) {
      // if (seenHashes.includes(tx.hash)) return;
      // seenHashes.push(tx.hash);
      fetch(`${process.env.RUNNER_ENDPOINT}/priceUpdate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(tx),
      }).catch(e => {
        logger.error(`cannot send priceUpdate ${e}`);
      });
      if (provider !== undefined) {
        
      }
    } else if (tx.to === ADDRS["COMPOUND_COMPTROLLER"]) {
      // if (seenHashes.includes(tx.hash)) return;
      // seenHashes.push(tx.hash);
  
      fetch(`${process.env.RUNNER_ENDPOINT}/paramUpdate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(tx),
      }).catch(e => {
        logger.error(`cannot send paramUpdate ${e}`)
      });
    }
  } 
}

/**
 * Reverse proxy to Runner for ngrok forwarding or testing.
 */
function server() {
  // TODO use blocknative as a fallback provider or complement with a seenHashes array
  // 1) install ngrok node wrapper, start ngrok, take note of forwarding address
  // 2) use forwarding address as blocknative webhook address
  // 3) add code to use as fallback when local node subscribe fails 
  // 4) to use in conjunction, add seenHashes
  const source = "reverse proxy";
  const app = express();
  app.use(bodyParser.json());
  app.post("/", async (req, res) => {
    const tx = req.body;
    if (tx.status === "pending") {
      send(tx, source, undefined);
    }
    res.send("ok");
  });
  app.post("/test", async (req, res) => {
    const tx = req.body;
    send(tx, source, undefined);
    logger.debug(`${__filename} received test tx`);
    res.send("ok");
  });
  app.listen(Number.parseInt(process.env.REVERSE_PROXY_PORT), () => {
    logger.info(
      `${__filename} reverse proxy listening on ${process.env.REVERSE_PROXY_PORT}`
    );
  });
}

/**
 * 
 * @param {*} provider 
 * @param {String} source 
 */
async function subscribe(provider, source) {
  if (source.slice(0, 6) === "ethers") {
    provider.send("eth_blockNumber", []).then((reply) => console.debug(reply));
    provider.on("pending", (tx) => {
      // console.debug(tx);
    });
  } else {
    provider.eth
    .subscribe("pendingTransactions", (error, result) => {
      if (error) {
        logger.error(`could not subscribe to tx pool using ${source} ${error}`);
      }
    })
    .on("data", async function (txHash) {
      // console.debug(source);
      // console.debug(txHash, new Date());
      const tx = await provider.eth.getTransaction(txHash);      
      if (tx === null) {
        // console.debug("tx evicted from pending pool");
        return;
      }
      send(tx, source, provider);
    });
  }
}

/**
 * 
 */
async function check() {
  const checkJob = schedule.scheduleJob(PARAMS.CHECK_SCHEDULE, 
    () => {
      send(undefined, "check", undefined);
    }
  );
}

check().then().catch(err => logger.error(err));

server();

const web3IPC = new Web3(
  new Web3.providers.IpcProvider(process.env.IPC_PROVIDER_ENDPOINT, net)
);
subscribe(web3IPC, "ipc").then().catch(err => logger.error(err));

// const web3WS = new Web3(
//   new Web3.providers.WebsocketProvider(
//     process.env.WS_PROVIDER_ENDPOINT
//   )
// );
// subscribe(web3WS, "ws").then().catch(err => {
//   logger.error(err);
// });

// const provider = new providers.IpcProvider(process.env.IPC_PROVIDER_ENDPOINT);
// subscribe(provider, "ethers-ipc").then().catch(err => logger.error(err));

// const provider = new providers.WebSocketProvider(process.env.WS_PROVIDER_ENDPOINT);
// subscribe(provider, "ethers-ws").then().catch(err => logger.error(err));