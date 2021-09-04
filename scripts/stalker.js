const fetch = require('node-fetch');
const ethers = require('ethers');
const { ADDRS } = require('../lib/Constants');
const Logger = require('../lib/Logger');

let provider = new ethers.providers.IpcProvider("/home/daisuke/.ethereum/geth.ipc");
let logger = new Logger();

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// might miss some tx since 500 is so small
// ./geth --maxpeers 500 --txpool.globalslots 500 --txpool-globalqueue 100
async function main() {
    provider.on('block', async (block) => {
        logger.log("new block appended");

        // wait not too long for txs
        await sleep(5000);

        // what to do with queued?
        let content = await provider.send("txpool_content").pending;
        
        logger.log('fetched tx pool');
        
        for(let account in content) {
            for(let tx in account) {
                if (Object.values(ADDRS.OFFCHAIN_AGG).includes(tx.to)) {
                    fetch(`http://localhost${LOCAL.RUNNER_PORT}/priceUpdate`, {
                        method: "POST",
                        headers: "Content-Type: application/json",
                        body: JSON.stringify(tx)
                    });
                } else if (tx.to === ADDRS["COMPOUND_COMPTROLLER"]) {
                    fetch(`http://localhost${LOCAL.RUNNER_PORT}/paramUpdate`, {
                        method: "POST",
                        headers: "Content-Type: application/json",
                        body: JSON.stringify(tx)
                    });
                }
            }
        }

        logger.log('finished processing tx pool');
    });

    while(true) {}    
}

main().then();