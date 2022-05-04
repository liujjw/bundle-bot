const { ethers, BigNumber } = require("ethers");
const {
  FlashbotsBundleProvider,
  FlashbotsBundleResolution,
} = require("@flashbots/ethers-provider-bundle");

const AuctionBidPricer = require("./AuctionBidPricer");
const { PARAMS, ABIS } = require("./Constants");
const FindShortfallPositions = require("./FindShortfallPositions");
const AccountsDbClient = require("./AccountsDbClient");
const Utils = require("./Utils");
const { EventEmitter } = require("events");

require("dotenv").config({ path: __dirname + "../.env"});

/**
 * 
 */
class RunnerWorker extends EventEmitter {
  /**
   * 
   */
  constructor() {
    super();
    // BOT_ADDR: process.env.BOT_ADDR,
    // PROVIDER_ENDPOINT: process.env.PROVIDER_ENDPOINT,
    // NODE_ENV: process.env.NODE_ENV,
    // REDIS_HOST: process.env.REDIS_HOST,
    // REDIS_PORT: process.env.REDIS_PORT,

    // Note on provider: for test we need two providers. One, we use Goerli provider for flashbots. However, we also need to use a localhost:8545 forked hardhat node for the finder to get accounts and params.
    // For production, we use only the given provider.
    this.provider =
    process.env.NODE_ENV !== "production"
      ? new ethers.getDefaultProvider("goerli")
      : new ethers.providers.JsonRpcProvider(process.env.PROVIDER_ENDPOINT);
    this.signerWithProvider = new ethers.Wallet(process.env.MM0A5_PK, this.provider);
    this.bot = new ethers.Contract(
      process.env.BOT_ADDR,
      ABIS.BOT,
      this.signerWithProvider
    );
    this.flashbotsAuthSigner = new ethers.Wallet(process.env.MM0A6_PK);
    this.futureBlocks = 2;

    this.store;
    this.bidPricer;
    this.lowerBoundGasPrice;
    this.params;
    this.curBlockNumber;
    this.maxBaseFeeInFutureBlock;
  }

  /**
 * 
 * @param {*} liquidationTxsInfo 
 * @param {*} backrunTxs 
 * @return {*}
 */
  async bundleAndSendTxsToFlashbots(liquidationTxsInfo, backrunTxs) {
    const flashbotsProvider =
      process.env.NODE_ENV !== "production"
        ? await FlashbotsBundleProvider.create(
            this.signerWithProvider.provider,
            this.flashbotsAuthSigner,
            "https://relay-goerli.flashbots.net/",
            "goerli"
          )
        : await FlashbotsBundleProvider.create(
            this.signerWithProvider.provider,
            this.flashbotsAuthSigner
          );

    for (const txInfo of liquidationTxsInfo) {
      const gasUsedUpperBound = BigNumber.from(PARAMS.GAS_USED_UPPER_BOUND);
      const gasPriceAndReward = await this.bidPricer.v2_getWinningGasPrice(
        gasUsedUpperBound,
        txInfo.netProfitFromLiquidationGivenGasPrice
      );

      const tip = gasPriceAndReward.totalRewardInWei.div(BigNumber.from(21000));
      const coinbasePayment = {
        to: await this.signerWithProvider.getAddress(),
        value: 0,
        maxFeePerGas: this.maxBaseFeeInFutureBlock.add(tip),
        maxPriorityFeePerGas: tip,
        gasLimit: BigNumber.from(21000),
      };
      const populatedCoinbasePayment = await this.signerWithProvider.populateTransaction(
        coinbasePayment
      );
      const signedCoinbasePayment = await this.signerWithProvider.signTransaction(
        populatedCoinbasePayment
      );

      this.emit("info", `about to liquidate\n${JSON.stringify(txInfo, null, 2)}`);
      this.emit("info",
        `with total ether payment of ${ethers.utils.formatEther(
          gasPriceAndReward.totalRewardInWei
        )}`
      );
      this.emit("info",
        `for liquidation adjusted gas price of ${ethers.utils.formatUnits(
          gasPriceAndReward.liquidationAdjustedGasPrice,
          9
        )} gwei`
      );

      const unsignedLiqTx = await this.bot.populateTransaction.liquidate(
        txInfo.cTokenBorrowed,
        txInfo.tokenBorrowed,
        txInfo.cTokenCollateral,
        txInfo.tokenCollateral,
        txInfo.borrower,
        txInfo.repayAmount,
        txInfo.maxSeizeTokens,
        {
          gasLimit: BigNumber.from(PARAMS.LIQUIDATION_GAS_UPPER_BOUND),
        }
      );
      const signedAndSerializedLiqTx = await this.signerWithProvider.signTransaction(
        unsignedLiqTx
      );

      const bundle = [];
      for (tx of backrunTxs) {
        bundle.push({ signedTransaction: tx });
      }
      bundle.push({ signedTransaction: signedAndSerializedLiqTx });
      bundle.push({ signedTransaction: signedCoinbasePayment });

      const signedTransactionsBundle = await flashbotsProvider.signBundle(bundle);

      const simulation = await flashbotsProvider.simulate(
        signedTransactionsBundle,
        this.curBlockNumber + this.futureBlocks
      );
      if ("error" in simulation) {
        if (process.env.NODE_ENV === "production") {
          throw new Error(`Flashbots simulation error: 
            ${simulation.error.message}`);
        }
      } else {
        this.emit("info", `Flashbots simulation success: 
                  ${JSON.stringify(simulation, null, 2)}`);
      }

      const bundleSubmission = await flashbotsProvider.sendRawBundle(
        signedTransactionsBundle,
        this.curBlockNumber + this.futureBlocks
      );
      if ("error" in bundleSubmission) {
        throw new Error(
          `Bundle submission error: ${bundleSubmission.error.message}`
        );
      }
      const waitResponse = await bundleSubmission.wait();
      this.emit("info", "Wait response: " + FlashbotsBundleResolution[waitResponse]);
    }
  }

  // TODO investigate losses with demo-research.ts
  // TODO bundle and user stats with getUserStats() and getBundleStats()
  /**
   * 
   * @param {*} finderData 
   */
  async process(finderData) {
    this.store = new AccountsDbClient(
      {
        host: process.env.REDIS_HOST,
        port: process.env.REDIS_PORT,
      },
      this.provider
    );
    await this.store.init();

    this.params = await this.store.getStoredCompoundParams();
    this.bidPricer = new AuctionBidPricer(
      Utils.bigNumToFloat(this.params.prices["ETH"], 6)
    );

    const block = await provider.getBlock("latest");
    this.curBlockNumber = block.number;
    if (block.baseFeePerGas === null) {
      throw new Error("missing base fee gas price from block");
    }
    this.maxBaseFeeInFutureBlock = FlashbotsBundleProvider.getMaxBaseFeeInFutureBlock(
      block.baseFeePerGas,
      this.futureBlocks
    );
    this.lowerBoundGasPrice = this.maxBaseFeeInFutureBlock;

    const accounts = await this.store.getStoredCompoundAccounts(finderData.chunkIndex,
      finderData.splitFactor);

    const finder = new FindShortfallPositions(
      accounts,
      this.params,
      this.lowerBoundGasPrice,
      process.env.NODE_ENV !== "production"
        ? new ethers.providers.JsonRpcProvider(process.env.PROVIDER_ENDPOINT)
        : this.provider
    );

    if (finderData.newParamType !== undefined) {
      finderData.newParamValue.value = BigNumber.from(
        finderData.newParamValue.value
      );
      finder.setParam(finderData.newParamType, finderData.newParamValue);
      if (finderData.newParamValue.ticker === "ETH") {
        this.bidPricer.ethPrice = Utils.bigNumToFloat(finderData.newParamValue.value, 8);
      }
    }

    const result = await finder.getLiquidationTxsInfo();
    await bundleAndSendTxsToFlashbots(result, finderData.backrunTxs);
  };
}

module.exports = RunnerWorker;

