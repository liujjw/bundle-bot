const { ENDPOINTS, TX_CONST } = require('./Constants');
const Logger = require("./Logger");

const fetch = require('node-fetch');
const { ethers, BigNumber }  = require('ethers');

class AuctionBidPricer {
    // ethPrice: float
    constructor(ethPrice) {
        this.ethPrice = ethPrice;
        this.logger = new Logger();
    }

    // requires numBlocks between 1-10000
    async getLastFlashbotsBlocks(numBlocks) {
        let fullBlockData = await fetch(ENDPOINTS.FLASHBOTS_GET_BLOCKS + `?limit=${numBlocks}`);
        fullBlockData = await fullBlockData.json();
        // fullBlockData.latest_block_number
        return fullBlockData.blocks;
    }

    // ignores profit size, just chooses the highest price that still keeps us profitable; this approach is harder for others to figure out
    async v1_getWinningGasPrice(gasUsedUpperBound, upperBoundProfit, lowerBoundGasPrice) {
        let blocks = await this.getLastFlashbotsBlocks(50);
        let highestGasPrice = lowerBoundGasPrice;
        let totalRewardInWei = highestGasPrice.mul(gasUsedUpperBound);

        for(let block of blocks) {
            let bundleAdjustedGasPrice = BigNumber.from(block.gas_price);
            if (bundleAdjustedGasPrice.lt(lowerBoundGasPrice)) 
                continue;
            let gasFeeInWei = bundleAdjustedGasPrice.mul(gasUsedUpperBound);
            let gasFeeInEth = Number.parseFloat(ethers.utils.formatEther(gasFeeInWei));
            let gasFeeInDollars = this.ethPrice * gasFeeInEth;

            // logger.log(ethers.utils.formatUnits(bundleAdjustedGasPrice, 9), gasFeeInEth, gasFeeInDollars);

            if (upperBoundProfit - gasFeeInDollars > TX_CONST.MIN_LIQ_PROFIT) {
                highestGasPrice = 
                    (highestGasPrice.lt(bundleAdjustedGasPrice) ? bundleAdjustedGasPrice : highestGasPrice);
                totalRewardInWei = 
                    (totalRewardInWei.lt(gasFeeInWei) ? gasFeeInWei : totalRewardInWei);
            }
        }
        return { 
            bundleAdjustedGasPrice: highestGasPrice,
            totalRewardInWei: totalRewardInWei
        };
    }

    // pays 90% of profit size
    // learn what top searchers pay, and pay like 1% more than them
    // as for me randomize between 90-95% 
    // note: if two of us pay 90% profit size, and then one of us uses less gas, then adjusted gas price of one will be higher and thus win; thus i think i should move all my capital and use it as inventory, once i get my financial aid back
}

module.exports = AuctionBidPricer;