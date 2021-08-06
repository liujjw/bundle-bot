const express = require('express');
const Piscina = require('piscina');

const { LOCAL, ADDRS, ABIS } = require('./Constants');
const Logger = require('./Logger');

const { BigNumber, ethers } = require('ethers');
const { Transaction } = require("@ethereumjs/tx");

class Runner {
    constructor() {
        this.logger = new Logger();
        this.piscina = new Piscina({
            filename: __dirname + "/RunnerWorker.js",
            idleTimeout: 100000000
        });
        this.splitFactor = 5;

        this.app = express();
        this.app.use(express.json());

        this.app.post('/', async (req, res) => {  
            if(req.body.status === 'confirmed' || req.body.status === 'failed' || req.body.status === 'pending-simulation')
                return;
            
            if(req.body.to === ADDRS["COMPOUND_COMPTROLLER"]) {
                try {
                    await this.processOtherParamUpdate(req.body);
                } catch(e) {
                    this.logger.log(e);
                }
                this.logger.log(`started procesing other param update ${req.body.hash}`);
            } else if(Object.values(ADDRS.OFFCHAIN_AGG).includes(req.body.to)) {
                try {
                    await this.processPriceUpdate(req.body);
                } catch(e) {
                    this.logger.log(e);
                }
            } 
            res.send("done");
        });

        this.app.listen(LOCAL.RUNNER_PORT, () => {
            console.log(`listening on http://localhost:${LOCAL.RUNNER_PORT}`);
        });
    }

    async processPriceUpdate(tx) {
        let offchainAggInterface = new ethers.utils.Interface(ABIS.OFFCHAIN_AGG);
        let decodedInput;
        try {
            decodedInput = offchainAggInterface.parseTransaction({data: tx.input});
        } catch(e) {
            if(e !== null) {
                this.logger.log(e);
                return;
            }
        }
        if(decodedInput.name !== "transmit")  {
            this.logger.log(`unknown decoded function name: ${e}`);
            return;
        }

        this.logger.log(`started processing pending price update with hash ${tx.hash} and pending timestamp ${tx.pendingTimeStamp}`);

        // UPDATE concurrently run this tx to make sure no revert occurs (estimateGas)
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
            newParamType: "prices",
            newParamValue: {
                newPrice: medianPrice.toHexString(),
                ticker: ADDRS.REVERSE_OFFCHAIN_AGG[tx.to]
            }
        }
        
        this.useWorkers(finderData);
    }

    // async processOtherParamUpdate(blockNativePendingTx) {
    //     let finderData = {
    //         params: this.params
    //     }

    //     let methodName = blockNativePendingTx.contractCall.methodName;
    //     if (methodName === "_setCloseFactor") {
    //         let val = BigNumber.from(blockNativePendingTx.contractCall.params.newCloseFactorMantissa);
    //         finderData.newParamType = "closeFactor";
    //         finderData.newParamValue = val;

    //     } else if (methodName === "_setLiquidationIncentive") {
    //         let val = BigNumber.from(blockNativePendingTx.contractCall.params.newLiquidationIncentiveMantissa);
    //         finderData.newParamType = "liquidationIncentive";
    //         finderData.newParamValue = val;

    //     } else if (methodName === "_setCollateralFactor") {
    //         let val = blockNativePendingTx.contractCall.params.newCollateralFactorMantissa;
    //         let ctoken = blockNativePendingTx.contractCall.params.cToken;
    //         // here 
    //     } else {
    //         return;
    //     }

    //     // here parse the blocknative object into an actual pending tx or set of them
    //     let pendingTx;
    //     let signedAndSerializedPendingTx;
    //     this.useWorkers(finderData, signedAndSerializedPendingTx);
    // }

    useWorkers(finderData) {
        for(let i = 0; i < this.splitFactor; i++) {
            finderData.chunkIndex = i;
            finderData.splitFactor = this.splitFactor;
            // finderData.port = Math.floor((Math.random() * 6));
            this.piscina.run(finderData).catch(e => {
                if(e !== null)
                    this.logger.log(e);
            });
        }
    }
}

module.exports = Runner;