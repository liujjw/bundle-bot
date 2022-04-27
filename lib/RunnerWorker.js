const { ethers, BigNumber } = require("ethers");
const {
  FlashbotsBundleProvider,
  FlashbotsBundleResolution,
} = require("@flashbots/ethers-provider-bundle");

const AuctionBidPricer = require("./AuctionBidPricer");
const { PARAMS, ADDRS, ABIS } = require("./Constants");
const FindShortfallPositions = require("./FindShortfallPositions");
const { createLogger, format, transports } = require("winston");
const AccountsDbClient = require("./AccountsDbClient");
const Utils = require("./Utils");

const { chunk } = require("lodash");
const { assert } = require("chai");
require("dotenv").config();

// Note on provider: for test we need two providers. One, we use Goerli provider for flashbots. However, we also need to use a localhost:8545 forked hardhat node for the finder to get accounts and params.
// For production, we use only the given provider.
const provider =
  process.env.NODE_ENV !== "production"
    ? new ethers.getDefaultProvider("goerli")
    : new ethers.providers.JsonRpcProvider(process.env.PROVIDER_ENDPOINT);
const signerWithProvider = new ethers.Wallet(process.env.MM0A5_PK, provider);
const bot = new ethers.Contract(
  process.env.BOT_ADDR,
  ABIS.BOT,
  signerWithProvider
);
const flashbotsAuthSigner = new ethers.Wallet(process.env.MM0A6_PK);

const logger = createLogger({
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
  logger.add(
    new transports.Console({
      format: format.combine(format.colorize(), format.simple()),
    })
  );
}
const futureBlocks = 2;

let store;
let bidPricer;
let lowerBoundGasPrice;
let params;
let curBlockNumber;
let maxBaseFeeInFutureBlock;

async function bundleAndSendTxsToFlashbots(liquidationTxsInfo, backrunTxs) {
  const flashbotsProvider =
    process.env.NODE_ENV !== "production"
      ? await FlashbotsBundleProvider.create(
          signerWithProvider.provider,
          flashbotsAuthSigner,
          "https://relay-goerli.flashbots.net/",
          "goerli"
        )
      : await FlashbotsBundleProvider.create(
          signerWithProvider.provider,
          flashbotsAuthSigner
        );

  for (const txInfo of liquidationTxsInfo) {
    const gasUsedUpperBound = BigNumber.from(PARAMS.GAS_USED_UPPER_BOUND);
    const gasPriceAndReward = await bidPricer.v2_getWinningGasPrice(
      gasUsedUpperBound,
      txInfo.netProfitFromLiquidationGivenGasPrice
    );

    const tip = gasPriceAndReward.totalRewardInWei.div(BigNumber.from(21000));
    const coinbasePayment = {
      to: await signerWithProvider.getAddress(),
      value: 0,
      maxFeePerGas: maxBaseFeeInFutureBlock.add(tip),
      maxPriorityFeePerGas: tip,
      gasLimit: BigNumber.from(21000),
    };
    const populatedCoinbasePayment = await signerWithProvider.populateTransaction(
      coinbasePayment
    );
    const signedCoinbasePayment = await signerWithProvider.signTransaction(
      populatedCoinbasePayment
    );

    logger.info(`about to liquidate\n${JSON.stringify(txInfo, null, 2)}`);
    logger.info(
      `with total ether payment of ${ethers.utils.formatEther(
        gasPriceAndReward.totalRewardInWei
      )}`
    );
    logger.info(
      `for liquidation adjusted gas price of ${ethers.utils.formatUnits(
        gasPriceAndReward.liquidationAdjustedGasPrice,
        9
      )} gwei`
    );

    const unsignedLiqTx = await bot.populateTransaction.liquidate(
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
    const signedAndSerializedLiqTx = await signerWithProvider.signTransaction(
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
      curBlockNumber + futureBlocks
    );
    if ("error" in simulation) {
      logger.error(`Flashbots simulation error: 
                ${simulation.error.message}`);
      if (process.env.NODE_ENV === "production") return;
    } else {
      logger.info(`Flashbots simulation success: 
                ${JSON.stringify(simulation, null, 2)}`);
    }

    const bundleSubmission = await flashbotsProvider.sendRawBundle(
      signedTransactionsBundle,
      curBlockNumber + futureBlocks
    );
    if ("error" in bundleSubmission) {
      logger.error(
        `Bundle submission error: ${bundleSubmission.error.message}`
      );
      return;
    }
    const waitResponse = await bundleSubmission.wait();
    logger.info("Wait response: " + FlashbotsBundleResolution[waitResponse]);
  }
}

// TODO investigate losses with demo-research.ts
// TODO bundle and user stats with getUserStats() and getBundleStats()
module.exports = async (finderData) => {
  store = new AccountsDbClient(
    {
      host: process.env.REDIS_HOST,
      port: process.env.REDIS_PORT,
    },
    provider
  );
  await store.init();
  finderData.newParamValue.value = BigNumber.from(
    finderData.newParamValue.value
  );

  params = await store.getStoredCompoundParams();
  bidPricer = new AuctionBidPricer(
    Utils.bigNumToFloat(params.prices["ETH"], 6)
  );

  const block = await provider.getBlock("latest");
  curBlockNumber = block.number;
  if (block.baseFeePerGas === null) {
    throw new Error("missing base fee gas price from block");
  }
  maxBaseFeeInFutureBlock = FlashbotsBundleProvider.getMaxBaseFeeInFutureBlock(
    block.baseFeePerGas,
    futureBlocks
  );
  lowerBoundGasPrice = maxBaseFeeInFutureBlock;

  const accounts = await store.getStoredCompoundAccounts(finderData.chunkIndex,
    finderData.splitFactor);

  const finder = new FindShortfallPositions(
    accounts,
    params,
    lowerBoundGasPrice,
    process.env.NODE_ENV !== "production"
      ? new ethers.providers.JsonRpcProvider(process.env.PROVIDER_ENDPOINT)
      : provider
  );
  finder.setParam(finderData.newParamType, finderData.newParamValue);
  if (finderData.newParamValue.ticker === "ETH")
    bidPricer.ethPrice = Utils.bigNumToFloat(finderData.newParamValue.value, 8);

  const result = await finder.getLiquidationTxsInfo();
  await bundleAndSendTxsToFlashbots(result, finderData.backrunTxs);
};
