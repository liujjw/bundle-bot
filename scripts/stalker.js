const fetch = require('node-fetch');
const ethers = require('ethers');
const { ADDRS } = require('../lib/Constants');
const Logger = require('../lib/Logger');

let provider = new ethers.providers.IpcProvider("/home/daisuke/.ethereum/geth.ipc");

let logger = new Logger();

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// might miss some tx with small globalslots
// ./geth --maxpeers 500 
async function main() {
    // lags behind by 3-4 seconds sometimes...
    provider.on('block', async (blockNumber) => {
        logger.log(`#${blockNumber} appended`);

        // what to do with queued?
        // instantaneous
        let content = (await provider.send("txpool_content")).pending;   
        for(let [account, txs] of Object.entries(content)) {
            for(let [nonce, tx] of Object.entries(txs)) {
                if (Object.values(ADDRS.OFFCHAIN_AGG).includes(tx.to)) {

                    ///
                    logger.log('found a tx to frontrun');
                    process.exit(0);
                    ///
                    fetch(`http://localhost${LOCAL.RUNNER_PORT}/priceUpdate`, {
                        method: "POST",
                        headers: "Content-Type: application/json",
                        body: JSON.stringify(tx)
                    });
                } else if (tx.to === ADDRS["COMPOUND_COMPTROLLER"]) {
                    ///
                    logger.log('found a tx to frontrun');
                    process.exit(0);
                    ///
                    fetch(`http://localhost${LOCAL.RUNNER_PORT}/paramUpdate`, {
                        method: "POST",
                        headers: "Content-Type: application/json",
                        body: JSON.stringify(tx)
                    });
                }
            }
        }

        logger.log(`#${blockNumber} finished processing tx pool`);
    });
}

main().then();