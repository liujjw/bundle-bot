const { ethers, BigNumber } = require("ethers");
const {
  FlashbotsBundleProvider,
  FlashbotsBundleResolution,
} = require("@flashbots/ethers-provider-bundle");

const AuctionBidPricer = require("./AuctionBidPricer");
const { PARAMS, ABIS, ADDRS, ENDPOINTS } = require("./Constants");
const FindShortfallPositions = require("./FindShortfallPositions");
const AccountsDbClient = require("./AccountsDbClient");
const Utils = require("./Utils");
const logger = require("./Logger");

require("dotenv").config({ path: __dirname + "../.env"});

/**
 * 
 */
class RunnerWorker {
  /**
   * 
   */
  constructor() {
    // Note on provider: for test we need two providers. One, we use Goerli provider for flashbots. However, we also need to use a localhost:8545 forked hardhat node for the finder to get accounts and params.
    // For production, we use only the given provider.
    this.provider = new ethers.providers.JsonRpcProvider(process.env.PROVIDER_ENDPOINT);
    this.signerWithProvider = new ethers.Wallet(process.env.MMM_PK, this.provider);

    this.bot = new ethers.Contract(
      process.env.BOT_ADDR,
      ABIS.BOT,
      this.signerWithProvider
    );
    this.lendingPool = new ethers.Contract(
      ADDRS["AAVE_V2_LENDING_POOL"],
      ABIS.AAVE_V2_LENDING_POOL,
      this.signerWithProvider
    );
    this.flashbotsAuthSigner = new ethers.Wallet(process.env.MMM_PK);
    this.futureBlocks = 2;

    this.store = new AccountsDbClient(
      {
        host: process.env.REDIS_HOST,
        port: process.env.REDIS_PORT,
        database: process.env.DB_NUMBER_FOR_DATA
      },
      this.provider
    );
    this.flashbotsProvider;

    this.bidPricer;
    this.curBlockNumber;
    this.maxBaseFeeInFutureBlock;

    this.asyncInit = false;
  }

  /**
   * 
   * @param {*} bundle 
   */
  async sendToFlashbots(bundle) {

  }

  /**
 * Apply every backrunTx to each potential liquidation. 
 * @param {*} liquidationTxsInfo 
 * @param {*} backrunTxs 
 * @return {*}
 */
  async bundleTx(liquidationTxsInfo, backrunTxs) {
    for (const txInfo of liquidationTxsInfo) {
      const mevInfo = await this.bidPricer.getTip(
        BigNumber.from(PARAMS.COMP_LIQ_GAS_BOUND),
        txInfo.netProfitGivenBaseFee,
        txInfo.baseFee
      );

      logger.info(`about to liquidate\n${JSON.stringify(txInfo, null, 4)}`);
      logger.info(
        `with coinbase ether payment of ${ethers.utils.formatEther(
          mevInfo.weiTip
        )}`
      );
      logger.info(
        `for liquidation adjusted gas price of ${ethers.utils.formatUnits(
          mevInfo.liquidationAdjustedGasPrice,
          9
        )} gwei`
      );
      
      const params = ABIS.botEncode(
        txInfo.cTokenBorrowed,
        txInfo.cTokenCollateral,
        txInfo.tokenCollateral,
        txInfo.borrower,
        txInfo.maxSeizeTokens,
        mevInfo.weiTip,
        mevInfo.weiTip.add(
          ethers.utils.parseEther(PARAMS.MIN_LIQ_PROFIT_LESS_MEV_IN_ETH)
        )
      );
        
      // returns not the nonce of last tx but +1
      const initialNonce = await this.signerWithProvider.getTransactionCount();
      const otherPendingTx = await this.store.getNonce();
      const nonce = initialNonce + otherPendingTx;
      // assumes jobs are fifo
      await this.store.incrNonce();
      
      const unsignedFlashloanTx = 
        await this.lendingPool.populateTransaction.flashLoan(
          this.bot.address,
          [txInfo.tokenBorrowed],
          [txInfo.repayAmount],
          [ABIS.AAVE_V2_LENDING_POOL_FLASHLOAN.DEFAULT.MODE],
          this.bot.address,
          params,
          ABIS.AAVE_V2_LENDING_POOL_FLASHLOAN.DEFAULT.REFERRAL_CODE,
          {
            gasLimit: BigNumber.from(PARAMS.COMP_LIQ_GAS_BOUND),
            gasPrice: this.maxBaseFeeInFutureBlock,
            nonce: BigNumber.from(nonce)
          }
      );

      const signedAndSerializedLiqTx = await this.signerWithProvider.signTransaction(
        unsignedFlashloanTx
      );
      const liqTxObj = { signedTransaction: signedAndSerializedLiqTx };

      const bundle = [];
      if (backrunTxs !== undefined) {
        for (const tx of backrunTxs) {
          bundle.push({ signedTransaction: tx });
        }
      }
      bundle.push(liqTxObj);

      const signedTransactionsBundle = 
        await this.flashbotsProvider.signBundle(bundle);
      // TODO set nonce?
      const signedTransactionsBundleJustArb = 
        await this.flashbotsProvider.signBundle([bundle[bundle.length - 1]]);

      const simulation = await this.flashbotsProvider.simulate(
        signedTransactionsBundle,
        this.curBlockNumber + this.futureBlocks
      );
      if ("error" in simulation) {
        logger.warn(`Flashbots simulation error
          with bundleHash ${simulation.bundleHash}: 
            ${simulation.error.message}`
        );

        await this.store.decrNonce();
        return;
      } else {
        logger.info(`Flashbots simulation success 
          with bundleHash ${simulation.bundleHash}: 
            ${JSON.stringify(simulation, null, 4)}`
        );
        for (const result of simulation.results) {
          if (result.error === "execution reverted") {
            await this.store.decrNonce();
            return;
          }
        }
      }

      const bundleSubmission = await this.flashbotsProvider.sendRawBundle(
        signedTransactionsBundle,
        this.curBlockNumber + this.futureBlocks
      );
      const bundleSubmissionJustArb = await this.flashbotsProvider.sendRawBundle(
        signedTransactionsBundleJustArb,
        this.curBlockNumber + this.futureBlocks
      )
      
      if ("error" in bundleSubmission) {
        logger.error( 
          `Bundle submission error: ${bundleSubmission.error.message}`
        );
        await this.store.decrNonce();
        return;
      }
      const waitResponse = await bundleSubmission.wait();
      const str = FlashbotsBundleResolution[waitResponse];
      logger.info("Wait response: " + str);
      if (str !== "BundleIncluded") {
        this.store.decrNonce();
      }
    }
  }

  /**
   * 
   */
  async auxiliaryBundleProcessing() {

  }

  // TODO investigate losses with demo-research.ts
  // TODO bundle and user stats with getUserStats() and getBundleStats()
  /**
   * 
   * @param {*} finderData 
   */
  async process(finderData) {
    if (!this.asyncInit) {
      await this.store.init();
      this.flashbotsProvider = await FlashbotsBundleProvider.create(
            this.signerWithProvider.provider,
            this.flashbotsAuthSigner
          );
      this.asyncInit = true;
    }

    const params = await this.store.getStoredCompoundParams();
    this.bidPricer = new AuctionBidPricer(
      Utils.bigNumToFloat(
        params.prices["ETH"], 
        PARAMS.UNISWAP_ANCHORED_VIEW_DECIMALS
      )
    );

    const block = await this.provider.getBlock("latest");
    this.curBlockNumber = block.number;
    if (block.baseFeePerGas === null) {
      throw new Error("missing base fee gas price from block");
    }
    this.maxBaseFeeInFutureBlock = FlashbotsBundleProvider.getMaxBaseFeeInFutureBlock(
      block.baseFeePerGas,
      this.futureBlocks
    );

    const accounts = await this.store.getStoredCompoundAccounts(finderData.chunkIndex,
      finderData.splitFactor);
    const finder = new FindShortfallPositions(
      accounts,
      params,
      this.maxBaseFeeInFutureBlock,
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
        this.bidPricer.ethPrice = Utils.bigNumToFloat(
          finderData.newParamValue.value, PARAMS.OFFCHAIN_AGG_DECIMALS
        );
      }
    }

    const result = await finder.getLiquidationTxsInfo();
    await this.bundleTx(result, finderData.backrunTxs);
  };
}

module.exports = RunnerWorker;

