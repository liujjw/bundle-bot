const express = require("express");
const bodyParser = require("body-parser");
const EventEmitter = require("events");
const Queue = require("bull");

const { ABIS } = require("./Constants");

const { BigNumber, ethers } = require("ethers");
const { default: Common, Chain, Hardfork } = require("@ethereumjs/common");
const { FeeMarketEIP1559Transaction } = require("@ethereumjs/tx");
const Utils = require("../lib/Utils");

/**
 * Server
 */
class Runner extends EventEmitter {
  /**
   * @constructor
   */
  constructor() {
    super();

    this.taskQueue = new Queue("Task queue", process.env.URL_FOR_REDIS_QUEUE, {
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
    this.app.post("/arb", async (req, res) => {
      try {
        await this.arb(req.body);
        res.send("handle arb success");
      } catch (e) {
        this.emit("error", e);
        res.send(`error handling arb ${e}`);
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
        res.send(`error handling priceUpdate ${e}`);
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
        res.send(`error handling paramUpdate ${e}`);
      }
    });

    this.app.listen(Number.parseInt(process.env.RUNNER_PORT), () => {});
  }

  /**
   * 
   * @param {*} data 
   */
  async arb(data) {
    this.emit("info", "start arb processing");
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
      throw new Error("decode input failed");
    }
    if (decodedInput.name !== "transmit") {
      throw new Error("unknown decodedInput.name");
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
      nonce: "0x" + tx.nonce.toString(16),
      gasLimit: BigNumber.from(tx.gas).toHexString(),
      data: tx.input,
      value: BigNumber.from(tx.value).toHexString(),
      r: tx.r,
      s: tx.s,
      v: tx.v,
      maxFeePerGas: BigNumber.from(tx.maxFeePerGas).toHexString(),
      maxPriorityFeePerGas: BigNumber.from(
        tx.maxPriorityFeePerGas
      ).toHexString(),
      type: "0x02",
      chainId: "0x01",
      accessList: [],
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
      throw new Error("decode input failed");
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
      finderData.chunkIndex = i;
      finderData.splitFactor = this.splitFactor;
      this.taskQueue.add(finderData);
    }
  }
}

module.exports = Runner;
