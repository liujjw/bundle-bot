const fetch = require('node-fetch');
const ethers = require('ethers');
const { ADDRS } = require('../lib/Constants');
const winston = require('winston');

let provider = new ethers.providers.IpcProvider("/home/daisuke/.ethereum/geth.ipc");

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
    defaultMeta: { service: 'stalker.js' },
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

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// TODO filter mempool tx
// might miss some tx with small globalslots
// ./geth --maxpeers 500 
async function main() {
    // lags behind by 3-4 seconds sometimes...
    provider.on('block', async (blockNumber) => {
        logger.info(`#${blockNumber} appended`);

        let content = (await provider.send("txpool_content")).pending;   
        for(let [account, txs] of Object.entries(content)) {
            for(let [nonce, tx] of Object.entries(txs)) {
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
            }
        }
        logger.info(`#${blockNumber} finished processing tx pool`);
    });
}

main().then();