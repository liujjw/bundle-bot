const fetch = require('node-fetch');
const ethers = require('ethers');
const { ADDRS } = require('../lib/Constants');
const Logger = require('../lib/Logger');

let provider = new ethers.providers.IpcProvider("/home/daisuke/.ethereum/geth.ipc");
let logger = new Logger();

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// ./geth --maxpeers 500 --txpool.globalslots 50000 --txpool-globalqueue 10000
async function main() {
    provider.on('block', async (block) => {
        logger.log("new block appended");

        // wait not too long for txs
        await sleep(5000);

        let content = await provider.send("txpool_content");
        logger.log('fetched tx pool');
        
        for(let tx of content.slice(content.length - 150)) {
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
        logger.log('finished processing tx pool');
    });

    while(true) {}    
}

main().then();