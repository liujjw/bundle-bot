const fetch = require('node-fetch');
const ethers = require('ethers');
const { ADDRS } = require('../lib/Constants');

let provider = new ethers.providers.IpcProvider("\\\\.\\pipe\\geth.ipc");

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// use this sort of as a reverse proxy or router
// this reverse proxy should abstract away details, it should provider lots of processing to the runner so the runner can just rely on an interface 

async function main() {
    console.log(await provider.getBlock("latest"));
    // check if right tx
    // if(req.body.status === 'confirmed' || req.body.status === 'failed' || req.body.status === 'pending-simulation')
    //             return;
    // if(Object.values(ADDRS.OFFCHAIN_AGG).includes(req.body.to)) {

    //             assert(req.body.to === ADDRS["COMPOUND_COMPTROLLER"]);
    // tx.contractCall.methodName decoded compound comptroller method name

    // while (true) {
    //     let start = Date.now();
    //     // modify `newPendingTransactions` to do this best, but seems very very hard            
    //     // its not too bad if i do this every five seconds, or every time a new head is appended on chain, although with this approach we could miss some events. The best way is perhaps just wait a couple seconds after a new head is appended on chain then check for pending tx, factor in the time it takes for us to process all 5000 tx such that we leave enough time to process a mempool update and publish to blocks. Maybe like up to 7 seconds?
    //     let content = await provider.send("txpool_content");
    //     let stop = Date.now();
    //     console.log(stop - start);
    //     for(let tx of content) {
    //         if (tx.from in ADDRS.REVERSE_OFFCHAIN_AGG) {
    //             fetch(`http://localhost${LOCAL.RUNNER_PORT}`, {
    //                 method: "POST",
    //                 headers: "Content-Type: application/json",
    //                 body: JSON.stringify(tx)
    //             })
    //         }
    //     }

    //     await sleep(7000);
    // }
}

main().then();