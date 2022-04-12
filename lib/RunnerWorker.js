const { ethers, BigNumber } = require('ethers');
const { FlashbotsBundleProvider, FlashbotsBundleResolution } = require('@flashbots/ethers-provider-bundle');

const AuctionBidPricer = require('./AuctionBidPricer');
const { PARAMS, ADDRS, ABIS } = require('./Constants');
const FindShortfallPositions = require('./FindShortfallPositions');
const { createLogger, format, transports } = require('../');
const AccountsDbClient = require('./AccountsDbClient');
const Utils = require('./Utils');

const { chunk } = require('lodash');
const { assert } = require('chai');

let provider = new ethers.providers.JsonRpcProvider(process.env.PROVIDER_ENDPOINT);
let signerWithProvider = new ethers.Wallet(process.env.MM0A5_PK, provider);
let bot = new ethers.Contract(process.env.BOT_ADDR, ABIS.BOT, signerWithProvider);
let flashbotsAuthSigner = new ethers.Wallet(process.env.MM0A6_PK);

let logger = createLogger({
    level: 'info',
    format: format.combine(
        format.timestamp({
          format: 'YYYY-MM-DD HH:mm:ss'
        }),
        format.errors({ stack: true }),
        format.splat(),
        format.json()
    ),
    defaultMeta: { service: 'RunnerWorker.js' },
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
const futureBlocks = 2;

let store;
let bidPricer;
let lowerBoundGasPrice;
let params;
let curBlockNumber;
let maxBaseFeeInFutureBlock;

async function bundleAndSendTxsToFlashbots(liquidationTxs, backrunTx) {
    let flashbotsProvider = await FlashbotsBundleProvider.create(signerWithProvider.provider, flashbotsAuthSigner); 

    for (let tx of liquidationTxs) {
        let gasUsedUpperBound = BigNumber.from(PARAMS.GAS_USED_UPPER_BOUND);
        let gasPriceAndReward = await bidPricer.v2_getWinningGasPrice(
            gasUsedUpperBound,
            tx.netProfitFromLiquidationGivenGasPrice
        );

        let tip = gasPriceAndReward.totalRewardInWei.div(BigNumber.from(21000));
        let coinbasePayment = {
            to: await signerWithProvider.getAddress(),
            value: 0,
            maxFeePerGas: maxBaseFeeInFutureBlock.add(tip),
            maxPriorityFeePerGas: tip,
            gasLimit: BigNumber.from(21000)
        }
        let populatedCoinbasePayment = await signerWithProvider.populateTransaction(coinbasePayment);
        let signedCoinbasePayment = await signerWithProvider.signTransaction(populatedCoinbasePayment);

        logger.info(`about to liquidate\n${JSON.stringify(tx, null, 2)}`);
        logger.info(`with total ether payment of ${ethers.utils.formatEther(gasPriceAndReward.totalRewardInWei)}`)
        logger.info(`for liquidation adjusted gas price of ${ethers.utils.formatUnits(gasPriceAndReward.liquidationAdjustedGasPrice, 9)} gwei`); 

        let unsignedLiqTx = await bot.populateTransaction.liquidate(
            tx.cTokenBorrowed,
            tx.tokenBorrowed,
            tx.cTokenCollateral,
            tx.tokenCollateral,
            tx.borrower, 
            tx.repayAmount,
            tx.maxSeizeTokens,
            {
                gasLimit: BigNumber.from(PARAMS.LIQUIDATION_GAS_UPPER_BOUND),
                maxFeePerGas: BigNumber.from(0).add(maxBaseFeeInFutureBlock),
                maxPriorityFeePerGas: BigNumber.from(0)
            }
        );
        let signedAndSerializedLiqTx = await signerWithProvider.signTransaction(unsignedLiqTx);

        let signedTransactionsBundle = await flashbotsProvider.signBundle([
            { signedTransaction: backrunTx },
            { signedTransaction: signedAndSerializedLiqTx },
            { signedTransaction: signedCoinbasePayment } 
        ]);

        let simulation = await flashbotsProvider.simulate(
            signedTransactionsBundle, 
            curBlockNumber + futureBlocks
        );
        if ('error' in simulation) {
            logger.error(`Flashbots simulation error: 
                ${simulation.error.message}`);
            return;
        } else {
            logger.info(`Flashbots simulation success: 
                ${JSON.stringify(simulation, null, 2)}`);
        }

        let bundleSubmission = await flashbotsProvider.sendRawBundle(
            signedTransactionsBundle, 
            curBlockNumber + futureBlocks
        );
        if('error' in bundleSubmission) {
            logger.error(bundleSubmission.error.message);
            return;
        }
        let waitResponse = await bundleSubmission.wait();
        logger.info("Wait response: " + FlashbotsBundleResolution[waitResponse]);
    }
    
}


module.exports = async (finderData) => {
    store = new AccountsDbClient({
        host: process.env.REDIS_HOST,
        port: process.env.REDIS_PORT
    }, provider);
    await store.init();
    // NOTE always deserialize finderData!
    finderData.newParamValue.value = BigNumber.from(finderData.newParamValue.value._hex);

    params = await store.getStoredCompoundParams();
    bidPricer = new AuctionBidPricer(Utils.bigNumToFloat(params.prices["ETH"], 6));

    let block = await provider.getBlock("latest");
    curBlockNumber = block.number;
    if(block.baseFeePerGas === null) {
        throw new Error("missing base fee gas price from block");   
    }
    maxBaseFeeInFutureBlock = FlashbotsBundleProvider.getMaxBaseFeeInFutureBlock(block.baseFeePerGas, futureBlocks);
    lowerBoundGasPrice = maxBaseFeeInFutureBlock;
    
    let accounts;
    // console.log(finderData.chunkIndex);
    if (finderData.splitFactor === 16) {
        accounts = await store.getSickStoredCompoundAccounts(finderData.chunkIndex.toString(16));
    } else {
        accounts = await store.getSickStoredCompoundAccounts();
        if(finderData.splitFactor < accounts.length) {
            let chunkSize = Math.ceil(accounts.length / finderData.splitFactor);
            let chunks = chunk(accounts, chunkSize);
            accounts = chunks[finderData.chunkIndex];
            assert(chunks.length === finderData.splitFactor);
        }
    } 
    let finder = new FindShortfallPositions(
        accounts,
        params,
        lowerBoundGasPrice,
        provider
    );
    finder.setParam(finderData.newParamType, finderData.newParamValue);
    if(finderData.newParamValue.ticker === "ETH")
        bidPricer.ethPrice = Utils.bigNumToFloat(finderData.newParamValue.value, 8);

    ///  
    // let scale = 1e8;
    // let newPrice = BigNumber.from(500 * scale);
    // finder.setParam("price", { ticker: "ETH", newPrice: newPrice });
    // bidPricer.ethPrice = Utils.bigNumToFloat(newPrice, 8);
    ///

    let result = await finder.getLiquidationTxs();
    await bundleAndSendTxsToFlashbots(result, finderData.backrunTx);
};