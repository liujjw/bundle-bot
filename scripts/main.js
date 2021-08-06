const { fork } = require('child_process');
const { ethers } = require("ethers");

const AccountsDbClient = require("../lib/AccountsDbClient");
const { LOCAL, ABIS, ADDRS } = require('../lib/Constants');
const Logger = require('../lib/Logger');
const logger = new Logger();

require('dotenv').config({ path: __dirname + "/../.env"});

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

let provider = new ethers.providers.AlchemyProvider(1, process.env.ALCHEMY_KEY);
let db = {
    host: LOCAL.REDIS_ACCOUNTS_STORE_HOST,
    port: LOCAL.REDIS_PORT
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
            logger.log(`erorr updating db with error ${e}`);
            continue;
        }
        logger.log(`updated db accounts around ${blockNumber}`);
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
        } catch(e) {
            logger.log(`error updating db params with error ${e}`);
            continue;
        }
        await sleep(5000);
        // about 15 seconds between updates
        // logger.log(`updated db params`);
    }
}

async function main() {
    updateParams();
    updateAccounts();
    // await sleep(80000); STARTUP reactivate?
    fork(__dirname + "/runner.js");    
    fork(__dirname + "/stalker.js");
}

logger.log(`${__filename} ${process.pid}`);
main().catch(e => {
    console.error("UNCAUGHT ERROR:", e)
    process.exit(1);
});

