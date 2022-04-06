const { fork } = require('child_process');
const { ethers } = require("ethers");

const AccountsDbClient = require("../lib/AccountsDbClient");
const { ABIS, ADDRS, PARAMS } = require('../lib/Constants');
const { createLogger, format, transports } = require('winston');

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
    defaultMeta: { service: 'main.js' },
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
    while(true) {
        let blockNumber = await store.fetchLatestSyncedBlockNumber();
        try {   
            await store.setCompoundAccounts();
        } catch(e) {
            logger.error(`erorr updating db with error ${e}`);
            continue;
        }
        logger.info(`updated db accounts around ${blockNumber}`);
        await sleep(PARAMS.DB_UPDATE_ACCOUNTS_SLEEP_MS);
    }
}

async function updateParams() {
    while(true) {
        try {   
            await store.setCompoundParams(); 
        } catch (e) {
            logger.error(`error updating db params with error ${e}`);
            continue;
        }
        await sleep(PARAMS.DB_UPDATE_PARAMS_SLEEP_MS);
        logger.info(`updated db params`);
    }
}

async function main() {
    updateParams();
    updateAccounts();
    await sleep(PARAMS.WAIT_TIME_FOR_DB_TO_INIT_MS);
    fork(__dirname + "/runner.js");    
    fork(__dirname + "/stalker.js");
}

logger.info(`started ${__filename} ${process.pid}`);
main().catch(e => {
    logger.error(`uncaught error in main ${e}`);
});

