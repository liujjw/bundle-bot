const { fork } = require('child_process');
const { ethers } = require("ethers");

const AccountsDbClient = require("../lib/AccountsDbClient");
const { ABIS, ADDRS } = require('../lib/Constants');
const winston = require('winston');
let logger = winston.createLogger({
    level: 'info',
    format: format.combine(
        format.timestamp({
          format: 'YYYY-MM-DD HH:mm:ss'
        }),
        format.errors({ stack: true }),
        format.splat(),
        format.json()
    ),
    defaultMeta: { service: 'main.js' },
    transports: [
        new winston.transports.File({ filename: 'error.log', level: 'error'}),
        new winston.transports.File({ filename: 'combined.log' }),
    ],
});

if (process.env.NODE_ENV !== 'production') {
    logger.add(new winston.transports.Console({
      format: format.combine(
        format.colorize(),
        format.simple()
      ),
    }));
}

require('dotenv').config({ path: __dirname + "/../.env"});

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

let provider = new ethers.providers.JsonRpcProvider(process.env.PROVIDER_ENDPOINT);
let db = {
    host: process.env.REDIS_HOST,
    port: process.env.REDIS_PORT
};
let priceFeed = new ethers.Contract(ADDRS.UNISWAP_ANCHORED_VIEW, ABIS.UNISWAP_ANCHORED_VIEW, provider)
let comptroller = new ethers.Contract(ADDRS.COMPOUND_COMPTROLLER, ABIS.COMPOUND_COMPTROLLER, provider);

let store = new AccountsDbClient(db, provider, priceFeed, comptroller);

async function updateAccounts() {
    // let provider = new ethers.providers.JsonRpcProvider();
    // let provider = new ethers.providers.InfuraProvider(1, process.env.INFURA_KEY);
    // FEATURE try websockets, look at docs tho

    while(true) {
        let blockNumber = await store.fetchLatestSyncedBlockNumber();
        try {   
            await store.setCompoundAccounts();
        } catch(e) {
            logger.error(`erorr updating db with error ${e}`);
            continue;
        }
        logger.info(`updated db accounts around ${blockNumber}`);
        // dont wait, since existing accounts may update frequently, even though new accounts usually dont have shortfall
        // await sleep(3600000);
    }
}

async function updateParams() {
    // about 13 second average block time
    // 8 secs already
    while(true) {
        try {   
            await store.setCompoundParams(); 
        } catch (e) {
            logger.error(`error updating db params with error ${e}`);
            continue;
        }
        await sleep(5000);
        // about 15 seconds between updates
        // logger.info(`updated db params`);
    }
}

async function main() {
    updateParams();
    updateAccounts();
    // await sleep(80000); STARTUP reactivate?
    fork(__dirname + "/runner.js");    
    fork(__dirname + "/stalker.js");
}

logger.info(`started ${__filename} ${process.pid}`);
main().catch(e => {
    console.error("UNCAUGHT ERROR:", e)
    process.exit(1);
});

