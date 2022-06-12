const express = require("express");
const bodyParser = require("body-parser");
const Queue = require("bull");
const logger = require("../lib/Logger");

const { ABIS } = require("./Constants");

const { BigNumber, ethers } = require("ethers");
// const { default: Common, Chain, Hardfork } = require("@ethereumjs/common");
const { TransactionFactory } = require("@ethereumjs/tx");
const Utils = require("../lib/Utils");

process.on('unhandledRejection', (reason, promise) => {
  console.log('Unhandled Rejection at:', reason.stack || reason)
})

/**
 * Server
 */
class Runner {
  /**
   * @constructor
   */
  constructor() {
    this.taskQueue = new Queue("Task queue", {
      redis: {
        db: Number.parseInt(process.env.DB_NUMBER_FOR_JOBS),
        host: process.env.REDIS_HOST,
        port: process.env.REDIS_PORT
      }
    });
    this.splitFactor = Number.parseInt(process.env.NUM_WORKERS);

    this.app = express();
    this.app.use(bodyParser.json());

    /**
     * A non-transaction trigger starts processing for potential arb.
     */
    this.app.post("/check", async (req, res) => {
      try {
        await this.check();
        res.send("handle check success");
      } catch (e) {
        logger.error(`check error ${e}}`);
        res.send("check error");
      }
    });

    /**
     * Price update triggers processing to find potential arb.
     */
    this.app.post("/priceUpdate", async (req, res) => {
      try {
        await this.processPriceUpdate(req.body);
        res.send("handle price update success");
      } catch (e) {
        logger.error(`error handling price update ${req.body} ${e}`);
        res.send("price update error");
      }
    });

    /**
     * Parameter update triggers processing to find potential arb.
     */
    this.app.post("/paramUpdate", async (req, res) => {
      try {
        await this.processParamUpdate(req.body);
        res.send("handle param update sucess");
      } catch (e) {
        logger.error(`error handling param update ${req.body} ${e}`);
        res.send("param update error");
      }
    }); 

    this.app.listen(Number.parseInt(process.env.RUNNER_PORT), () => {
      logger.info(`${__filename} listening on port ${process.env.RUNNER_PORT}`);
    });
  }

  /**
   * 
   * @param {*} data 
   */
  async check() {
    logger.verbose("start routine processing to find arbs");
    this.useWorkers({});
  }

  /**
   * 
   * @param {*} str 
   * @return {*}
   */
  toHex(str) {
    return "0x" + Number.parseInt(str).toString(16);
  }

  /**
   * 
   * @param {*} tx 
   */
  async processPriceUpdate(tx) {
    const offchainAggInterface = new ethers.utils.Interface(ABIS.OFFCHAIN_AGG);
    let decodedInput;
    try {
      decodedInput = offchainAggInterface.parseTransaction({ data: tx.input });
    } catch (e) {
      logger.debug(`price update decode input failed of tx ${tx.hash}`);
      return;
    }
    if (decodedInput.name !== "transmit") {
      logger.debug("price update unknown decodedInput.name");
      return;
    }

    // TODO concurrently run this tx to make sure no revert occurs (estimateGas)
    const result = decodedInput.args[0];
    const decoder = new ethers.utils.AbiCoder();
    const decodedResult = decoder.decode(
      ["bytes32", "bytes32", "int192[]"],
      result
    );
    const prices = decodedResult[2];
    const medianPrice = prices[Math.floor(prices.length / 2)];

    const finderData = {
      newParamType: "price",
      newParamValue: {
        value: medianPrice.toHexString(),
        ticker: Utils.offchainAggAddrToTicker(tx.to),
      },
      txHash: tx.hash,
    };

    logger.verbose(
    `priceUpdate:\n ${JSON.stringify(finderData)}`
    );

    if (process.env.TX_FORMAT !== "GETH") {
      logger.warn("tx format not geth, serialization could fail");
    }

    // const common = new Common({
    //   chain: Chain.Mainnet,
    //   hardfork: Hardfork.London 
    // });
    const backrunTxParams = {
      to: tx.to,
      nonce: this.toHex(tx.nonce),
      gasLimit: this.toHex(tx.gas),
      data: tx.input,
      value: this.toHex(tx.value),
      r: tx.r,
      s: tx.s,
      v: tx.v,
      maxFeePerGas: this.toHex(tx.maxFeePerGas),
      maxPriorityFeePerGas: this.toHex(tx.maxPriorityFeePerGas),
      type: tx.type,
      chainId: tx.chainId,
      accessList: tx.accessList,
    };
    const unserializedBackrunTx = TransactionFactory.fromTxData(
      backrunTxParams
      // { common }
    );
    const serializedBackrunTx = unserializedBackrunTx.serialize();
    finderData.backrunTxs = ["0x" + serializedBackrunTx.toString("hex")];
    
    this.useWorkers(finderData);
  }

  /**
   * 
   * @param {*} tx 
   * @return {*}
   */
  async processParamUpdate(tx) {
    const finderData = {};
    const comptrollerInterface = new ethers.utils.Interface(
      ABIS.COMPOUND_COMPTROLLER
    );
    let decodedInput;
    try {
      decodedInput = comptrollerInterface.parseTransaction({ data: tx.input });
    } catch (e) {
      logger.debug(`param update decode input failed of tx hash ${tx.hash}`);
      return;
    }
    const methodName = decodedInput.name;

    finderData.txHash = tx.hash;
    if (methodName === "_setCloseFactor") {
      const val = BigNumber.from(tx.contractCall.params.newCloseFactorMantissa);
      finderData.newParamType = "closeFactor";
      finderData.newParamValue = {
        value: val,
      };
    } else if (methodName === "_setLiquidationIncentive") {
      const val = BigNumber.from(
        tx.contractCall.params.newLiquidationIncentiveMantissa
      );
      finderData.newParamType = "liquidationIncentive";
      finderData.newParamValue = {
        value: val,
      };
    } else if (methodName === "_setCollateralFactor") {
      const val = BigNumber.from(
        tx.contractCall.params.newCollateralFactorMantissa
      );
      const cToken = tx.contractCall.params.cToken;
      finderData.newParamType = "collateralFactor";
      finderData.newParamValue = {
        value: val,
        id: cToken,
      };
    } else {
      return;
    }

    logger.verbose(
    `paramUpdate:\n ${JSON.stringify(finderData)}`
    );

    finderData.backrunTxs = [];

    this.useWorkers(finderData);
  }

  /**
   * 
   * @param {*} finderData 
   */
  useWorkers(finderData) {
    for (let i = 0; i < this.splitFactor; i++) {
      const clonedFinderData = JSON.parse(JSON.stringify(finderData));
      clonedFinderData.chunkIndex = i;
      clonedFinderData.splitFactor = this.splitFactor;
      this.taskQueue.add(clonedFinderData);
    }
  }
}

module.exports = Runner;
