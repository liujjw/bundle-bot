const express = require("express");
const bodyParser = require("body-parser");
const EventEmitter = require("events");
const Queue = require("bull");

const { ABIS } = require("./Constants");

const { BigNumber, ethers } = require("ethers");
const { default: Common, Chain, Hardfork } = require("@ethereumjs/common");
const { FeeMarketEIP1559Transaction } = require("@ethereumjs/tx");
const Utils = require("../lib/Utils");

process.on('unhandledRejection', (reason, promise) => {
  console.log('Unhandled Rejection at:', reason.stack || reason)
})

/**
 * Server
 */
class Runner extends EventEmitter {
  /**
   * @constructor
   */
  constructor() {
    super();

    this.taskQueue = new Queue("Task queue", process.env.REDIS_ENDPOINT, {
      redis: {
        db: Number.parseInt(process.env.DB_NUMBER_FOR_JOBS)
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
        this.emit("error", e);
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
        this.emit("error", e);
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
        this.emit("error", e);
        res.send("param update error");
      }
    });

    this.app.listen(Number.parseInt(process.env.RUNNER_PORT), () => {});
  }

  /**
   * 
   * @param {*} data 
   */
  async check() {
    this.emit("info", "start routine processing to find arbs");
    this.useWorkers({});
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
      this.emit("error", `decode input failed of tx ${tx.hash}`);
      return;
    }
    if (decodedInput.name !== "transmit") {
      this.emit("error", "unknown decodedInput.name");
      return;
    }

    this.emit("info",
      `started processing pending price update with hash ${tx.hash}`
    );

    // TODO concurrently run this tx to make sure no revert occurs (estimateGas)
    const result = decodedInput.args[0];
    const decoder = new ethers.utils.AbiCoder();
    const decodedResult = decoder.decode(
      ["bytes32", "bytes32", "int192[]"],
      result
    );
    const prices = decodedResult[2];
    const medianPrice = prices[Math.floor(prices.length / 2)];

    const common = new Common({
      chain: Chain.Mainnet,
      hardfork: Hardfork.London,
    });
    const backrunTxParams = {
      to: tx.to,
      nonce: tx.nonce,
      gasLimit: tx.gas,
      data: tx.input,
      value: tx.value,
      r: tx.r,
      s: tx.s,
      v: tx.v,
      maxFeePerGas: tx.maxFeePerGas,
      maxPriorityFeePerGas: tx.maxPriorityFeePerGas,
      type: tx.type,
      chainId: tx.chainId,
      accessList: tx.accessList,
    };
    const unserializedBackrunTx = FeeMarketEIP1559Transaction.fromTxData(
      backrunTxParams,
      { common }
    );
    const serializedBackrunTx = unserializedBackrunTx.serialize();

    const finderData = {
      backrunTxs: ["0x" + serializedBackrunTx.toString("hex")],
      newParamType: "price",
      newParamValue: {
        value: medianPrice.toHexString(),
        ticker: Utils.offchainAggAddrToTicker(tx.to),
      },
    };

    this.emit("info",
      `using data to find liquidation:\n ${JSON.stringify(finderData)}`
    );
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
      this.emit("error", `decode input failed of tx hash ${tx.hash}`);
      return;
    }
    const methodName = decodedInput.name;

    this.emit("info", `started procesing param update ${tx.hash}`);

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
    finderData.backrunTxs = [];

    this.emit("info",
      `using data to find liquidation:\n ${JSON.stringify(finderData)}`
    );
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
