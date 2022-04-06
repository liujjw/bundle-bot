const { ENDPOINTS, PARAMS } = require('./Constants');
const { createLogger, format, transports } = require('winston');

const fetch = require('node-fetch');
const { ethers, BigNumber }  = require('ethers');

class AuctionBidPricer {
    // ethPrice: float
    constructor(ethPrice) {
        this.ethPrice = ethPrice;
        this.logger = createLogger({
            level: 'info',
            format: format.combine(
                format.timestamp({
                  format: 'YYYY-MM-DD HH:mm:ss'
                }),
                format.errors({ stack: true }),
                format.splat(),
                format.json()
            ),
            defaultMeta: { service: 'AuctionBidPricer.js' },
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

            logger.info("gas fees", ethers.utils.formatUnits(bundleAdjustedGasPrice, 9), gasFeeInEth, gasFeeInDollars);

            if (upperBoundProfit - gasFeeInDollars > PARAMS.MIN_LIQ_PROFIT) {
                highestGasPrice = 
                    (highestGasPrice.lt(bundleAdjustedGasPrice) ? bundleAdjustedGasPrice : highestGasPrice);
                totalRewardInWei = 
                    (totalRewardInWei.lt(gasFeeInWei) ? gasFeeInWei : totalRewardInWei);
            }
        }
        return { 
            liquidationAdjustedGasPrice: highestGasPrice,
            totalRewardInWei: totalRewardInWei
        };
    }

    // pays randomized >95% of profit size, should measure exactly how much they pay
    async v2_getWinnignGasPrice(gasUsedUpperBound, upperBoundProfit) {
        let mevRatio = 0.95;
        let mevPaymentDollars = upperBoundProfit * mevRatio;
        let mevPaymentWei = ethers.utils.parseEther(mevPaymentDollars / this.ethPrice); 
        let liquidationAdjustedGasPrice = mevPaymentWei.div(gasUsedUpperBound);
        return {
            liquidationAdjustedGasPrice: liquidationAdjustedGasPrice,
            totalRewardInWei: mevPaymentWei
        }
    }

}

module.exports = AuctionBidPricer;