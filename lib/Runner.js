const express = require('express');
const Piscina = require('piscina');

const { ADDRS, ABIS } = require('./Constants');
const { createLogger, format, transports } = require('winston');

const { BigNumber, ethers } = require('ethers');
const { Transaction } = require("@ethereumjs/tx");

class Runner {
    constructor() {
        this.logger = createLogger({
            level: 'info',
            format: format.combine(
                format.timestamp({
                  format: 'YYYY-MM-DD HH:mm:ss'
                }),
                format.errors({ stack: true }),
                format.splat(),
                format.json()
            ),
            defaultMeta: { service: 'Runner.js' },
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

        this.piscina = new Piscina({
            filename: __dirname + "/RunnerWorker.js",
            idleTimeout: 100000000
        });
        this.splitFactor = 5;

        this.app = express();
        this.app.use(express.json());

        this.app.post('/priceUpdate', async (req, res) => {  
            try {
                await this.processPriceUpdate(req);
            } catch(e) {
                this.logger.error(`handling /priceUpdate ${e}`);
            }
            res.send("done");
        });

        this.app.post('/paramUpdate', async (req, res) => {
            try {
                await this.processParamUpdate(req);
            } catch(e) {
                this.logger.error(`handling /paramUpdate ${e}`);
            }
            res.send("done");
        });

        this.app.listen(process.env.RUNNER_PORT, () => {
            console.log(`runner server listening on port ${process.env.RUNNER_PORT}`);
        });
    }

    async processPriceUpdate(tx) {
        let offchainAggInterface = new ethers.utils.Interface(ABIS.OFFCHAIN_AGG);
        let decodedInput;
        try {
            decodedInput = offchainAggInterface.parseTransaction({ data: tx.input });
        } catch(e) {
            if(e !== null) {
                this.logger.error(`parseTransaction ${e}`);
                return;
            }
        }
        if(decodedInput.name !== "transmit")  {
            this.logger.error(`unknown decoded function name: ${e}`);
            return;
        }

        this.logger.info(`started processing pending price update with hash ${tx.hash} and pending timestamp ${tx.pendingTimeStamp}`);

        // TODO concurrently run this tx to make sure no revert occurs (estimateGas)
        let result = decodedInput.args[0];
        let decoder = new ethers.utils.AbiCoder();
        let decodedResult = decoder.decode(['bytes32', 'bytes32', 'int192[]'], result);
        let prices = decodedResult[2];
        let medianPrice = prices[Math.floor(prices.length / 2)];

        let backrunTxParams = {
            to: tx.to,
            nonce: "0x"+tx.nonce.toString(16),
            gasLimit: BigNumber.from(tx.gas).toHexString(),
            data: tx.input,
            value: BigNumber.from(tx.value).toHexString(),
            r: tx.r, s: tx.s, v: tx.v
        };
        if(tx.gasPrice !== undefined) {
            backrunTxParams.gasPrice = BigNumber.from(tx.gasPrice).toHexString();
        } else {
            backrunTxParams.maxFeePerGas = BigNumber.from(tx.maxFeePerGas.toHexString());
            backrunTxParams.maxPriorityFeePerGas = BigNumber.from(tx.maxPriorityFeePerGas.toHexString());
        }
        let unserializedBackrunTx = Transaction.fromTxData(backrunTxParams);
        let serializedBackrunTx = unserializedBackrunTx.serialize();

        let finderData = {
            backrunTx: "0x"+serializedBackrunTx.toString('hex'),
            newParamType: "price",
            newParamValue: {
                value: medianPrice.toHexString(),
                ticker: ADDRS.REVERSE_OFFCHAIN_AGG[tx.to]
            }
        }
        
        this.useWorkers(finderData);
    }

    async processParamUpdate(tx) {
        let finderData = {};
        let comptrollerInterface = new ethers.utils.Interface(ABIS.COMPOUND_COMPTROLLER);
        let decodedInput;
        try {
            decodedInput = comptrollerInterface.parseTransaction({data: tx.input});
        } catch(e) {
            if(e !== null) {
                this.logger.error(`parseTx ${e}`);
                return;
            }
        }
        let methodName = decodedInput.name;

        this.logger.info(`started procesing param update ${tx.hash} and pending timestamp ${tx.pendingTimeStamp}`);

        if (methodName === "_setCloseFactor") {
            let val = BigNumber.from(tx.contractCall.params.newCloseFactorMantissa);
            finderData.newParamType = "closeFactor";
            finderData.newParamValue = {
                value: val
            };

        } else if (methodName === "_setLiquidationIncentive") {
            let val = BigNumber.from(tx.contractCall.params.newLiquidationIncentiveMantissa);
            finderData.newParamType = "liquidationIncentive";
            finderData.newParamValue = {
                value: val
            };

        } else if (methodName === "_setCollateralFactor") {
            let val = BigNumber.from(tx.contractCall.params.newCollateralFactorMantissa);
            let cToken = tx.contractCall.params.cToken;
            finderData.newParamType = "collateralFactor";
            finderData.newParamValue = {
                value: val,
                id: cToken
            };
        } else {
            return;
        }

        this.useWorkers(finderData);
    }

    useWorkers(finderData) {
        for(let i = 0; i < this.splitFactor; i++) {
            finderData.chunkIndex = i;
            finderData.splitFactor = this.splitFactor;
            // finderData.port = Math.floor((Math.random() * 6));
            this.piscina.run(finderData).catch(e => {
                if(e !== null)
                    this.logger.error(e);
            });
        }
    }
}

module.exports = Runner;