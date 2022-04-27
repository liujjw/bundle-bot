const express = require("express");
const bodyParser = require("body-parser");
const Piscina = require("piscina");

const { OFFCHAIN_AGG_ADDR_TO_TICKER, ABIS, PARAMS } = require("./Constants");
const { createLogger, format, transports } = require("winston");

const { BigNumber, ethers } = require("ethers");
const { default: Common, Chain, Hardfork } = require("@ethereumjs/common");
const { FeeMarketEIP1559Transaction } = require("@ethereumjs/tx");
const Utils = require("../lib/Utils");

/**
 * Server
 */
class Runner {
  /**
   * @constructor
   */
  constructor() {
    this.logger = createLogger({
      level: "info",
      format: format.combine(
        format.timestamp({
          format: "YYYY-MM-DD HH:mm:ss",
        }),
        format.errors({ stack: true }),
        format.splat(),
        format.json()
      ),
      defaultMeta: { service: `${__filename}` },
      transports: [
        new transports.File({ filename: "error.log", level: "error" }),
        new transports.File({ filename: "combined.log" }),
      ],
    });

    if (process.env.NODE_ENV !== "production") {
      this.logger.add(
        new transports.Console({
          format: format.combine(format.colorize(), format.simple()),
        })
      );
    }

    this.splitFactor = PARAMS.NUM_THREADS;

    this.app = express();
    this.app.use(bodyParser.json());

    /**
     * A non-transaction trigger starts processing for potential arb.
     */
    this.app.post("/arb", async (req, res) => {
      try {
        await this.arb(req.body);
      } catch (e) {
        this.logger.error(`handling /arb ${e}`);
      }
      res.send("done");
    });

    /**
     * Price update triggers processing to find potential arb.
     */
    this.app.post("/priceUpdate", async (req, res) => {
      try {
        await this.processPriceUpdate(req.body);
      } catch (e) {
        this.logger.error(
          `handling /priceUpdate ${e} with stack trace: \n ${e.stack}`
        );
      }
      res.send("done");
    });

    /**
     * Parameter update triggers processing to find potential arb.
     */
    this.app.post("/paramUpdate", async (req, res) => {
      try {
        await this.processParamUpdate(req.body);
      } catch (e) {
        this.logger.error(`handling /paramUpdate ${e}`);
      }
      res.send("done");
    });

    this.app.listen(Number.parseInt(process.env.RUNNER_PORT), () => {
      this.logger.info(
        `runner server listening at ${process.env.RUNNER_ENDPOINT}`
      );
    });
  }

  /**
   * 
   * @param {*} data 
   */
  async arb(data) {
    this.logger.info("started processing arb");
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
      throw e;
    }
    if (decodedInput.name !== "transmit") {
      throw Error(`unknown decoded function name: ${e}`);
    }

    this.logger.info(
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

    this.logger.info(
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
      throw e;
    }
    const methodName = decodedInput.name;

    this.logger.info(`started procesing param update ${tx.hash}`);

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

    this.logger.info(
      `using data to find liquidation:\n ${JSON.stringify(finderData)}`
    );
    this.useWorkers(finderData);
  }

  /**
   * 
   * @param {*} finderData 
   */
  useWorkers(finderData) {
    const piscina = new Piscina({
      filename: __dirname + "/RunnerWorker.js",
      idleTimeout: 10000,
      env: {
        BOT_ADDR: process.env.BOT_ADDR,
        PROVIDER_ENDPOINT: process.env.PROVIDER_ENDPOINT,
        NODE_ENV: process.env.NODE_ENV,
        REDIS_HOST: process.env.REDIS_HOST,
        REDIS_PORT: process.env.REDIS_PORT,
      },
    });

    for (let i = 0; i < this.splitFactor; i++) {
      finderData.chunkIndex = i;
      finderData.splitFactor = this.splitFactor;
      // finderData.port = Math.floor((Math.random() * 6));
      piscina.run(finderData).catch((e) => {
        throw e;
      });
    }
  }
}

module.exports = Runner;
