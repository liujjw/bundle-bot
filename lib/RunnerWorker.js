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
    this.batchProvider = new ethers.providers.JsonRpcBatchProvider(process.env.PROVIDER_ENDPOINT);
    this.signerWithProvider = new ethers.Wallet(process.env.MMM_PK, this.provider);
    this.signerWithBatchProvider = new ethers.Wallet(process.env.MMM_PK, this.batchProvider);

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
    this.finder;
    this.finderInit = false;
  }

  /**
   * 
   * @param {*} str1 
   * @return {*}
   */
  hex_to_ascii(str1) {
    const hex  = str1.toString();
    let str = '';
    for (let n = 0; n < hex.length; n += 2) {
      str += String.fromCharCode(parseInt(hex.substr(n, 2), 16));
    }
    return str;
   }

  /**
   * 
   * @param {*} signedTransactionsBundle 
   */
  async send(signedTransactionsBundle) {
    logger.verbose(`signedTxBundle at ${this.curBlockNumber}: 
      ${JSON.stringify(signedTransactionsBundle, null, 4)}`);

    const simulation = await this.flashbotsProvider.simulate(
      signedTransactionsBundle,
      this.curBlockNumber + this.futureBlocks
    );
    if ("error" in simulation) {
      logger.warn(`Flashbots simulation error
        with bundleHash ${simulation.bundleHash}: 
          ${simulation.error.message}`
      );

      // await this.store.decrNonce();
      return;
    } else {
      const revertMsgHex = simulation.firstRevert.revert;
      const revertMsg = this.hex_to_ascii(revertMsgHex);
      simulation.revertMsgPlaintext = revertMsg;
      logger.info(`Flashbots simulation success 
        with bundleHash ${simulation.bundleHash}: 
          ${JSON.stringify(simulation, null, 4)}`
      );
      for (const result of simulation.results) {
        if (result.error === "execution reverted") {
          // await this.store.decrNonce();
          return;
        }
      }
    }

    const bundleSubmission = await this.flashbotsProvider.sendRawBundle(
      signedTransactionsBundle,
      this.curBlockNumber + this.futureBlocks
    );
    
    if ("error" in bundleSubmission) {
      logger.error( 
        `Bundle submission error: ${bundleSubmission.error.message}`
      );
      // await this.store.decrNonce();
      return;
    }
    bundleSubmission.wait().then(async (waitResponse) => {
      const str = FlashbotsBundleResolution[waitResponse];
      logger.info("Wait response: " + str);
      if (str !== "BundleIncluded") {
        // await this.store.decrNonce();
      }
    });
    return;
  }

  /**
   * 
   * @param {*} liquidationTxsInfo 
   * @param {*} backrunTxs 
   * @return {*}
   */
  async constructBundle(liquidationTxsInfo, backrunTxs=undefined) {
    const bundle = [];
    let numBackrunTxs = 0;
    if (backrunTxs !== undefined) {
      numBackrunTxs = backrunTxs.length;
      for (const tx of backrunTxs) {
        bundle.push({ signedTransaction: tx });
      }
    }

    for (const txInfo of liquidationTxsInfo) {
      const mevInfo = await this.bidPricer.getTip(
        BigNumber.from(PARAMS.COMP_LIQ_GAS_BOUND),
        txInfo.netProfitGivenBaseFee,
        txInfo.baseFee
      );

      logger.info(`trying to liquidate\n${JSON.stringify(txInfo, null, 4)}`);
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
      const nonce = await this.signerWithProvider.getTransactionCount();
      const common = {
        gasLimit: BigNumber.from(PARAMS.COMP_LIQ_GAS_BOUND),
        gasPrice: this.maxBaseFeeInFutureBlock,
        nonce: BigNumber.from(nonce + bundle.length - numBackrunTxs)
      }
      
      const unsignedFlashloanTx = 
        await this.lendingPool.populateTransaction.flashLoan(
          this.bot.address,
          [txInfo.tokenBorrowed],
          [txInfo.repayAmount],
          [ABIS.AAVE_V2_LENDING_POOL_FLASHLOAN.DEFAULT.MODE],
          this.bot.address,
          params,
          ABIS.AAVE_V2_LENDING_POOL_FLASHLOAN.DEFAULT.REFERRAL_CODE,
          common
      );

      // simulate TODO
      const batchLendingPool = new ethers.Contract(
        ADDRS["AAVE_V2_LENDING_POOL"],
        ABIS.AAVE_V2_LENDING_POOL,
        this.signerWithBatchProvider
      );
      this.batchProvider.send("eth_sendRawTransaction", [backrunTxs[0]])
        .then((foo) => {
          logger.info(`price sim ${foo}`);
        });
      batchLendingPool.callStatic.flashLoan(
        this.bot.address,
          [txInfo.tokenBorrowed],
          [txInfo.repayAmount],
          [ABIS.AAVE_V2_LENDING_POOL_FLASHLOAN.DEFAULT.MODE],
          this.bot.address,
          params,
          ABIS.AAVE_V2_LENDING_POOL_FLASHLOAN.DEFAULT.REFERRAL_CODE,
          common
      ).then((foo) => {
        logger.info(`simulation success ${foo}`);
      }).catch((err) => {
        logger.error(`simerr ${err}`);
      });
      //
    
      const signedAndSerializedLiqTx = await this.signerWithProvider.signTransaction(
        unsignedFlashloanTx
      );
      const liqTxObj = { signedTransaction: signedAndSerializedLiqTx };
      bundle.push(liqTxObj); 
    }
    const signedTransactionsBundle = 
        await this.flashbotsProvider.signBundle(bundle);
        
    return [signedTransactionsBundle];
  }

  /**
   * 
   * @param {*} liquidationTxsInfo 
   * @param {*} backrunTxs 
   * @return {*}
   */
  async constructBundles(liquidationTxsInfo, backrunTxs=undefined) {
    const bundles = [];
    for (const txInfo of liquidationTxsInfo) {
      const mevInfo = await this.bidPricer.getTip(
        BigNumber.from(PARAMS.COMP_LIQ_GAS_BOUND),
        txInfo.netProfitGivenBaseFee,
        txInfo.baseFee
      );

      logger.info(`trying to liquidate\n${JSON.stringify(txInfo, null, 4)}`);
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

      const common = {
        gasLimit: BigNumber.from(PARAMS.COMP_LIQ_GAS_BOUND),
        gasPrice: this.maxBaseFeeInFutureBlock,
        nonce: BigNumber.from(nonce)
      }
      
      const unsignedFlashloanTx = 
        await this.lendingPool.populateTransaction.flashLoan(
          this.bot.address,
          [txInfo.tokenBorrowed],
          [txInfo.repayAmount],
          [ABIS.AAVE_V2_LENDING_POOL_FLASHLOAN.DEFAULT.MODE],
          this.bot.address,
          params,
          ABIS.AAVE_V2_LENDING_POOL_FLASHLOAN.DEFAULT.REFERRAL_CODE,
          common
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

      bundles.push(signedTransactionsBundle);
    }
    return bundles;
  }

  /**
   * 
   * @param {FinderData} finderData 
   * @param {bool} oneAtATime
   * @return {LiquidationTx[]}
   */
  async findLiquidations(finderData, oneAtATime=false) {
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
    
    if (!this.finderInit) {
      this.finder = new FindShortfallPositions(
        accounts,
        params,
        this.maxBaseFeeInFutureBlock,
        this.provider
      );
      this.finderInit = true;
    }

    if (finderData.newParamType !== undefined) {
      finderData.newParamValue.value = BigNumber.from(
        finderData.newParamValue.value
      );
      this.finder.setParam(finderData.newParamType, finderData.newParamValue);
      if (finderData.newParamValue.ticker === "ETH") {
        this.bidPricer.ethPrice = Utils.bigNumToFloat(
          finderData.newParamValue.value, PARAMS.OFFCHAIN_AGG_DECIMALS
        );
      }
    }

    return await this.finder.getLiquidationTxsInfo(oneAtATime);
  }

  // TODO investigate losses with demo-research.ts
  // TODO bundle and user stats with getUserStats() and getBundleStats()
  /**
   * 
   * @param {FinderData} finderData 
   */
  async process(finderData) {
    this.finderInit = false;
    if (!this.asyncInit) {
      await this.store.init();
      this.flashbotsProvider = await FlashbotsBundleProvider.create(
            this.signerWithProvider.provider,
            this.flashbotsAuthSigner
          );
      this.asyncInit = true;
    }

    /* 
    where n is the number of liquidations in a bundle,
    n of 1 bundle submission strategy
    con: need to synchronize or just brute force nonces ignoring simulation failures
    and cant capture all liquidations in one block since price update can only be in one 
    bundle, so the other bundles will fail bundle merging without price update
    TODO when builder-searcher thing comes out, maybe will be feasible
    pro: less combinations
    do not retry with just arb no backrun, for example 
    when liquidation for account A already secures the price update so 
    liquidation for account B only needs to send the liquidate tx 
    we can just send the no backrun concurrently with the backrun and manage the nonces
    */ 
    /*
    let liqTxs;
    do {
      liqTxs = await this.findLiquidations(finderData, oneAtATime=true);
      const bundles = await this.constructBundles(liqTxs, finderData.backrunTxs);
      for (const bundle of bundles) {
        await this.send(bundle);
      }
    } while (liqTxs.length !== 0)
    */

    // n of n
    // cons: one failing liquidation could ruin the entire bundle if just submitting once
    // pro: no need for nonce sync, could also brute force nonces and submit 
    // a combination of bundles with/without specific liquidations
    const liqTxs = await this.findLiquidations(finderData, false);
    if (liqTxs.length !== 0) {
      const bundles = await this.constructBundle(liqTxs, finderData.backrunTxs);
      const bundle = bundles[0];
      await this.send(bundle);
    }
  };
}

module.exports = RunnerWorker;

