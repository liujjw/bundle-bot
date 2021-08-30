const { ethers, BigNumber } = require('ethers');
const { FlashbotsBundleProvider, FlashbotsBundleResolution } = require('@flashbots/ethers-provider-bundle');

const AuctionBidPricer = require('./AuctionBidPricer');
const { TX_CONST, LOCAL, ADDRS, ABIS } = require('./Constants');
const FindShortfallPositions = require('./FindShortfallPositions');
const Logger = require('./Logger');
const AccountsDbClient = require('./AccountsDbClient');
const Utils = require('./Utils');

const { chunk } = require('lodash');
const { assert } = require('chai');

/// TEST
let providerLocal = new ethers.providers.JsonRpcProvider();
let botLocal = new ethers.Contract(ADDRS.BOT_ON_FORK, ABIS.BOT, providerLocal);
/// 

// let bot = new ethers.Contract(ADDRS['BOT_ON_MAIN'], ABIS['BOT'], signerWithProvider);
let provider = new ethers.providers.AlchemyProvider(1, process.env.ALCHEMY_KEY);
let signerWithProvider = new ethers.Wallet(process.env.MM0A5_PK, provider);
let priceFeed = new ethers.Contract(ADDRS.UNISWAP_ANCHORED_VIEW, ABIS.UNISWAP_ANCHORED_VIEW, provider)
let comptroller = new ethers.Contract(ADDRS.COMPOUND_COMPTROLLER, ABIS.COMPOUND_COMPTROLLER, provider);
let flashbotsAuthSigner = new ethers.Wallet(process.env.MM0A6_PK);

let logger = new Logger();
let store = new AccountsDbClient({
    host: LOCAL.REDIS_ACCOUNTS_STORE_HOST,
    port: LOCAL.REDIS_PORT
}, provider, priceFeed, comptroller);

const futureBlocks = 2;

let bidPricer;
let lowerBoundGasPrice;
let params;
let curBlockNumber;
let maxBaseFeeInFutureBlock;

async function bundleAndSendTxsToFlashbots(liquidationTxs, backrunTx) {
    let flashbotsProvider = await FlashbotsBundleProvider.create(signerWithProvider.provider, flashbotsAuthSigner); 

    for (let tx of liquidationTxs) {
        let gasUsedUpperBound = BigNumber.from(TX_CONST.GAS_USED_UPPER_BOUND);
        // let gasPriceAndReward = await bidPricer.v1_getWinningGasPrice(
        //     gasUsedUpperBound, 
        //     tx.netProfitFromLiquidationGivenGasPrice,
        //     lowerBoundGasPrice
        // );
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

        logger.log(`about to liquidate\n${JSON.stringify(tx, null, 2)}`);
        logger.log(`with total ether payment of ${ethers.utils.formatEther(gasPriceAndReward.totalRewardInWei)}`)
        logger.log(`for liquidation adjusted gas price of ${ethers.utils.formatUnits(gasPriceAndReward.liquidationAdjustedGasPrice, 9)} gwei`); 

        let unsignedLiqTx = await botLocal.populateTransaction.liquidate(
            tx.cTokenBorrowed,
            tx.tokenBorrowed,
            tx.cTokenCollateral,
            tx.tokenCollateral,
            tx.borrower, 
            tx.repayAmount,
            tx.maxSeizeTokens,
            {
                gasLimit: BigNumber.from(TX_CONST.LIQUIDATION_GAS_UPPER_BOUND),
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

        // TODO timings?
        // let simulation = await flashbotsProvider.simulate(signedTransactionsBundle, curBlockNumber + futureBlocks);

        let bundleSubmission = await flashbotsProvider.sendRawBundle(signedTransactionsBundle, curBlockNumber + 1);
        let waitResponse = await bundleSubmission.wait();
        logger.log(FlashbotsBundleResolution[waitResponse]);
    }
    
}


module.exports = async (finderData) => {
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

    /// TEST 
    // let scale = 1e8;
    // let newPrice = BigNumber.from(500 * scale);
    // finder.setParam("price", { ticker: "ETH", newPrice: newPrice });
    // bidPricer.ethPrice = Utils.bigNumToFloat(newPrice, 8);
    ///

    let result = await finder.getLiquidationTxs();
    await bundleAndSendTxsToFlashbots(result, finderData.backrunTx);
};