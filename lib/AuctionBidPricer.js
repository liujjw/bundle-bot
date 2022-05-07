const { ENDPOINTS, PARAMS } = require("./Constants");

const fetch = require("node-fetch");
const { ethers, BigNumber } = require("ethers");

/**
 * 
 */
class AuctionBidPricer {
  /**
   * 
   * @param {float} ethPrice 
   */
  constructor(ethPrice) {
    this.ethPrice = ethPrice;
  }

  // requires numBlocks between 1-10000
  /**
   * 
   * @param {*} numBlocks 
   * @return {*}
   */
  async getLastFlashbotsBlocks(numBlocks) {
    let fullBlockData = await fetch(
      ENDPOINTS.FLASHBOTS_GET_BLOCKS + `?limit=${numBlocks}`
    );
    fullBlockData = await fullBlockData.json();
    // fullBlockData.latest_block_number
    return fullBlockData.blocks;
  }

  // ignores profit size, just chooses the highest price that still keeps us profitable; this approach is harder for others to figure out
  /**
   * 
   * @param {*} gasUsedUpperBound 
   * @param {*} upperBoundProfit 
   * @param {*} lowerBoundGasPrice 
   * @return {*}
   */
  async v1_getWinningGasPrice(
    gasUsedUpperBound,
    upperBoundProfit,
    lowerBoundGasPrice
  ) {
    const blocks = await this.getLastFlashbotsBlocks(50);
    let highestGasPrice = lowerBoundGasPrice;
    let totalRewardInWei = highestGasPrice.mul(gasUsedUpperBound);

    for (const block of blocks) {
      const bundleAdjustedGasPrice = BigNumber.from(block.gas_price);
      if (bundleAdjustedGasPrice.lt(lowerBoundGasPrice)) continue;
      const gasFeeInWei = bundleAdjustedGasPrice.mul(gasUsedUpperBound);
      const gasFeeInEth = Number.parseFloat(
        ethers.utils.formatEther(gasFeeInWei)
      );
      const gasFeeInDollars = this.ethPrice * gasFeeInEth;

      // logger.info(
      //   "gas fees",
      //   ethers.utils.formatUnits(bundleAdjustedGasPrice, 9),
      //   gasFeeInEth,
      //   gasFeeInDollars
      // );

      if (upperBoundProfit - gasFeeInDollars > PARAMS.MIN_LIQ_PROFIT) {
        highestGasPrice = highestGasPrice.lt(bundleAdjustedGasPrice)
          ? bundleAdjustedGasPrice
          : highestGasPrice;
        totalRewardInWei = totalRewardInWei.lt(gasFeeInWei)
          ? gasFeeInWei
          : totalRewardInWei;
      }
    }
    return {
      liquidationAdjustedGasPrice: highestGasPrice,
      totalRewardInWei: totalRewardInWei,
    };
  }

  /**
   * 
   * @param {*} gasUsedUpperBound 
   * @param {*} upperBoundProfit 
   * @param {*} baseFee
   * @return {*}
   */
  async getTip(gasUsedUpperBound, upperBoundProfit, baseFee) {
    // TOOD use baseFee more
    const mevRatio = PARAMS.GAS_PRICE_FRACTION_TO_PAY_MINER;
    const mevPaymentDollars = upperBoundProfit * mevRatio;
    const mevPaymentWei = ethers.utils.parseEther(
      `${mevPaymentDollars / this.ethPrice}`
    );
    const liquidationAdjustedGasPrice = mevPaymentWei
      .add(baseFee).div(gasUsedUpperBound);
    return {
      liquidationAdjustedGasPrice: liquidationAdjustedGasPrice,
      weiTip: mevPaymentWei,
    };
  }
}

module.exports = AuctionBidPricer;
