const fetch = require('node-fetch');
const Web3 = require('web3');
const net = require('net');
const { ADDRS } = require('../lib/Constants');
const { createLogger, format, transports } = require('winston');

let web3 = new Web3(new Web3.providers.IpcProvider(process.env.IPC_PROVIDER_ENDPOINT, net));
// let web3 = new Web3(new Web3.providers.IpcProvider('/d/ethereum/.ethereum/geth.ipc', net));
// let web3 = new Web3(new Web3.providers.WebsocketProvider(process.env.WS_PROVIDER_ENDPOINT));
// let web3 = new Web3(new Web3.providers.WebsocketProvider("ws://localhost:8546"));
// let web3 = new Web3("http://localhost:8545");
let logger = createLogger({
    level: 'info',
    format: format.combine(
        format.timestamp({
          format: 'YYYY-MM-DD HH:mm:ss'
        }),
        format.errors({ stack: true }),
        format.splat(),
        format.json()
    ),
    defaultMeta: { service: 'stalker.js' },
    transports: [
        new transports.File({ filename: 'error.log', level: 'error'}),
        new transports.File({ filename: 'combined.log' }),
    ],
});

if (process.env.NODE_ENV !== 'production') {
    logger.add(new transports.Console({
      format: format.combine(
        format.colorize(),
        format.simple()
      ),
    }));
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
    let subscription = web3.eth.subscribe('pendingTransactions', (error, result) => {
        if (error) {
            logger.error("could not subscribe to tx pool")
        } 
    }).on("data", function(tx) {
        if (Object.values(ADDRS.OFFCHAIN_AGG).includes(tx.to)) {
            logger.info('found a tx to frontrun sent to offchain agg');
            fetch(`${process.env.RUNNER_ENDPOINT}/priceUpdate`, {
                method: "POST",
                headers: "Content-Type: application/json",
                body: JSON.stringify(tx)
            });
        } else if (tx.to === ADDRS["COMPOUND_COMPTROLLER"]) {
            logger.info('found a tx to frontrun sent to comptroller');
            fetch(`${process.env.RUNNER_ENDPOINT}/paramUpdate`, {
                method: "POST",
                headers: "Content-Type: application/json",
                body: JSON.stringify(tx)
            });
        }
    });
}

main().then();