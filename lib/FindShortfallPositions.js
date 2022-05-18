const { ethers } = require("ethers");
const { BigNumber } = require("ethers");
const Uniswap = require("@uniswap/sdk");
const EventEmitter = require("events");

const { ADDRS, PARAMS, ABIS } = require("./Constants");
const { underlying, parseUnits, bigNumToFloat, bigNumsToFloats, 
  bigDecToFloat, numDecimals, numDecimals }= require("./Utils");

/**
 * Computes Compound borrowers who can be liquidated.
 */
class FindShortfallPositions extends EventEmitter {
  /**
   * 
   * @param {*} accounts 
   * @param {*} params 
   * @param {*} baseFee 
   * @param {*} provider 
   * @param {*} chainId 
   */
  constructor(
    accounts, 
    params, 
    baseFee, 
    provider, 
    chainId = Uniswap.ChainId.MAINNET) {
    super();
    this.accounts = accounts;
    // TODO parse params into a useable format such as native BigInt immediately
    // after being fetched as string from the db
    // TODO get rid of hardcoded numbers
    this.prices = bigNumsToFloats(params.prices, 6);
    this.exchangeRates = params.exchangeRates;
    this.collateralFactors = bigNumsToFloats(
      params.collateralFactors,
      18
    );
    this.liquidationBonus = bigNumToFloat(params.liquidationBonus, 18);
    this.closeFactor = bigNumToFloat(params.closeFactor, 18);

    this.baseFee = baseFee;

    this.provider = provider;
    this.comptroller = new ethers.Contract(
      ADDRS.COMPOUND_COMPTROLLER,
      ABIS.COMPOUND_COMPTROLLER,
      provider
    );

    this.minProfit = PARAMS.MIN_LIQ_PROFIT_LESS_MEV;
    this.chainId = chainId;
    this.uniswapPairDataCache = new Map();
  }

  /**
   * 
   * @param {*} accs 
   */
  setAccounts(accs) {
    this.accounts = accs;
  }

  /**
   *
   * @param {*} type
   * @param {*} newValue
   */
  setParam(type, newValue) {
    if (type === "closeFactor") {
      this.closeFactor = bigNumToFloat(newValue.value, 18);
    } else if (type == "liquidationIncentive") {
      this.liquidationIncentive = bigNumToFloat(newValue.value, 18);
    } else if (type == "price") {
      this.prices[newValue.ticker] = bigNumToFloat(newValue.value, 8);
    } else if (type == "collateralFactor") {
      this.collateralFactors[newValue.id] = bigNumToFloat(
        newValue.value,
        18
      );
    }
  }

  /**
   *
   * @return {*}
   */
  async getLiquidationTxsInfo() {
    const liquidationTxsInfo = [];
    for (const user of this.accounts) {
      try {
        const liquidationTx = await this.getLiquidationTxInfo(user);
        if (liquidationTx !== null) {
          liquidationTxsInfo.push(liquidationTx);
        }
      } catch (e) {
        this.emit("error", `processing user id ${user.id}`);
      }
    }
    return liquidationTxsInfo;
  }

  /**
   * 
   * @param {*} user 
   * @return {*}
   */
  userBorrowedMoreThanAllowed(user) {
    const maxBorrowValue = user.tokens.reduce((curValue, curToken) => {
      const amount = bigDecToFloat(curToken.supplyBalanceUnderlying);
      const price = this.prices[underlying(curToken.symbol)];
      const value = amount * price;
      return curValue + value * this.collateralFactors[curToken.symbol];
    }, 0);
    const curBorrowValue = user.tokens.reduce((curValue, curToken) => {
      // cannot be used as collateral
      if (
        curToken.symbol === "cUSDT" ||
        curToken.symbol === "cLINK" ||
        curToken.symbol === "cTUSD"
      )
        return curValue;
      const amount = bigDecToFloat(curToken.borrowBalanceUnderlying);
      const price = this.prices[underlying(curToken.symbol)];
      const value = amount * price;
      return curValue + value;
    }, 0);

    return (curBorrowValue >= maxBorrowValue)
  }

  /**
   * 
   * @param {*} user 
   * @param {*} cTokenToRepaySymbol 
   * @return {*}
   */
  calculateCollateralData(user, cTokenToRepaySymbol) {
    return user.tokens.reduce(
      ([curIndexOfHighest, curHighest], curToken, curIndex) => {
        if (
          curToken.symbol == cTokenToRepaySymbol ||
          curToken.symbol == "cUSDT"
        ) {
          return [curIndexOfHighest, curHighest];
        }

        const price = this.prices[underlying(curToken.symbol)];
        const amount = bigDecToFloat(curToken.supplyBalanceUnderlying);
        const curTokenSupplyValue = price * amount;
        if (curTokenSupplyValue > curHighest) {
          return [curIndex, curTokenSupplyValue];
        } else {
          return [curIndexOfHighest, curHighest];
        }
      },
      [0, 0]
    );
  }

  /**
   * 
   * @param {*} user 
   * @return {*}
   */
  calculateBorrowData(user) {
    return user.tokens.reduce(
      ([curIndexOfHighest, curHighest], curToken, curIndex) => {
        const price = this.prices[underlying(curToken.symbol)];
        const amount = bigDecToFloat(curToken.borrowBalanceUnderlying);
        const curTokenBorrowValue = price * amount;
        if (curTokenBorrowValue > curHighest) {
          return [curIndex, curTokenBorrowValue];
        } else {
          return [curIndexOfHighest, curHighest];
        }
      },
      [0, 0]
    );
  }

  /**
   * 
   * @param {*} cTokenToSeizeSymbol 
   * @param {*} cTokenToRepaySymbol 
   * @param {*} tokensSeizedBase 
   * @param {*} repayAmountBase 
   * @return {*}
   */
  async calculateUniswapData(
    cTokenToSeizeSymbol, 
    cTokenToRepaySymbol,
    tokensSeizedBase,
    repayAmountBase) {
    const tokenToSeizeSymbol = underlying(cTokenToSeizeSymbol, true);
    const tokenToRepaySymbol = underlying(cTokenToRepaySymbol, true);
    let numDecimals1;
    try {
      numDecimals1 = numDecimals(tokenToSeizeSymbol);
    } catch (e) {
      return [null, null];
    }
    const uniswapTokenSeized = new Uniswap.Token(
      this.chainId,
      ADDRS[tokenToSeizeSymbol],
      numDecimals1
    );
    let numDecimals2;
    try {
      numDecimals2 = numDecimals(tokenToRepaySymbol);
    } catch (e) {
      return [null, null];
    }
    const uniswapTokenRepaid = new Uniswap.Token(
      this.chainId,
      ADDRS[tokenToRepaySymbol],
      numDecimals2
    );
    let spentSeizedTokensBaseTA;
    
    // the seized repay pair eth/x or x/eth
    if (cTokenToSeizeSymbol === "cETH" || cTokenToRepaySymbol === "cETH") {
      let pairData = this.uniswapPairDataCache
        .get(tokenToSeizeSymbol+tokenToRepaySymbol);
      if (pairData === undefined) {
        pairData = await Uniswap.Fetcher.fetchPairData(
          uniswapTokenRepaid,
          uniswapTokenSeized,
          this.provider
        );
        this.uniswapPairDataCache
          .set(tokenToRepaySymbol+tokenToSeizeSymbol, pairData);
        this.uniswapPairDataCache
          .set(tokenToSeizeSymbol+tokenToRepaySymbol, pairData);
      }

      const route = new Uniswap.Route([pairData], uniswapTokenSeized);
      const trade = new Uniswap.Trade(
        route,
        new Uniswap.TokenAmount(uniswapTokenRepaid, repayAmountBase.toString()),
        Uniswap.TradeType.EXACT_OUTPUT
      );
      spentSeizedTokensBaseTA = trade.inputAmount;
    } else {
      // TODO find a better path not involving weth but direct trade
      const uniswapWeth = new Uniswap.Token(
        this.chainId,
        ADDRS["WETH"],
        numDecimals("WETH")
      );
      // neither tokens are weth
      let inputToWeth = this.uniswapPairDataCache.get(tokenToSeizeSymbol+"WETH");
      if (inputToWeth === undefined) {
        inputToWeth = await Uniswap.Fetcher.fetchPairData(
          uniswapTokenSeized,
          uniswapWeth,
          this.provider
        );
        this.uniswapPairDataCache.set(tokenToSeizeSymbol+"WETH", inputToWeth);
      }

      let wethToOutput = this.uniswapPairDataCache.get(tokenToRepaySymbol+"WETH");
      if (wethToOutput === undefined) {
        wethToOutput = await Uniswap.Fetcher.fetchPairData(
          uniswapWeth,
          uniswapTokenRepaid,
          this.provider
        );
        this.uniswapPairDataCache.set(tokenToRepaySymbol+"WETH", wethToOutput);
      } 

      const route = new Uniswap.Route(
        [inputToWeth, wethToOutput],
        uniswapTokenSeized,
        uniswapTokenRepaid
      );
      const trade = new Uniswap.Trade(
        route,
        new Uniswap.TokenAmount(uniswapTokenRepaid, repayAmountBase.toString()),
        Uniswap.TradeType.EXACT_OUTPUT
      );
      spentSeizedTokensBaseTA = trade.inputAmount;
    }
    // TODO sussy
    const spentSeizedTokensBase = BigNumber.from(
      spentSeizedTokensBaseTA.raw.toString()
    );

    if (spentSeizedTokensBase.gte(tokensSeizedBase)) {
      return [null, null];
    }

    const tokensSeizedBaseTA = new Uniswap.TokenAmount(
      uniswapTokenSeized,
      tokensSeizedBase.toString()
    );
    const remainingSeizedTokensTA = tokensSeizedBaseTA.subtract(
      spentSeizedTokensBaseTA
    );
    const remainingSeizedTokensScaled = Number.parseFloat(
      remainingSeizedTokensTA.toFixed(6)
    );
    return [spentSeizedTokensBase, remainingSeizedTokensScaled];
  }

  /**
   *
   * @param {*} user
   * @return {*}
   */
  async getLiquidationTxInfo(user) {
    // deprecated tokens
    // TODO can usdt be used as collateral?
    user.tokens = user.tokens.filter(
      (token) => token.symbol != "cREP" && token.symbol != "cSAI"
    );
    if (!this.userBorrowedMoreThanAllowed(user)) return null;

    const [
      indexOfTokenWithHighestBorrowBalanceValue,
      valueOfTokenWithHighestBorrowBalance,
    ] = this.calculateBorrowData(user);
    if (valueOfTokenWithHighestBorrowBalance <= this.minProfit * 2) return null;
    const cTokenToRepaySymbol =
      user.tokens[indexOfTokenWithHighestBorrowBalanceValue].symbol;
    const [
      indexOfTokenWithHighestCollateralBalanceValue,
      valueOfTokenWithHighestCollateralBalance,
    ] = this.calculateCollateralData(user, cTokenToRepaySymbol);
    if (valueOfTokenWithHighestCollateralBalance <= this.minProfit * 2) {
      return null;
    }
    const cTokenToSeizeSymbol =
      user.tokens[indexOfTokenWithHighestCollateralBalanceValue].symbol;
    if (
      valueOfTokenWithHighestCollateralBalance <=
      this.closeFactor *
        valueOfTokenWithHighestBorrowBalance *
        this.liquidationBonus
    ) {
      return null;
    }

    const repayAmountScaled =
      this.closeFactor *
      bigDecToFloat(
        user.tokens[indexOfTokenWithHighestBorrowBalanceValue]
          .borrowBalanceUnderlying
      );
    let repayAmountBase;
    try {
      repayAmountBase = parseUnits(
        repayAmountScaled.toString(),
        underlying(cTokenToRepaySymbol)
      );
    } catch (e) {
      return null;
    }

    const repayPrice =
      this.prices[underlying(cTokenToRepaySymbol)];
    const repayValue = repayPrice * repayAmountScaled;

    const [error, cTokensSeizedBase] =
      await this.comptroller.liquidateCalculateSeizeTokens(
        ADDRS[cTokenToRepaySymbol],
        ADDRS[cTokenToSeizeSymbol],
        repayAmountBase
      );
    if (error.toNumber() !== 0) {
      return null;
    }
    // TODO does not account for interest accumulation + onchain data
    const exchangeRateBase = this.exchangeRates[cTokenToSeizeSymbol];
    const exchangeRateScaleFactor = BigNumber.from(10).pow(18);
    // NOTE: ALWAYS mul before div 
    const tokensSeizedBase = exchangeRateBase
      .mul(cTokensSeizedBase).div(exchangeRateScaleFactor);

    const [spentSeizedTokensBase, remainingSeizedTokensScaled] = 
      await this.calculateUniswapData(cTokenToSeizeSymbol, 
        cTokenToRepaySymbol, tokensSeizedBase, repayAmountBase);
    if (spentSeizedTokensBase === null) {
      return null;
    }
    
    const remainingSeizedTokensValue =
      remainingSeizedTokensScaled *
      this.prices[underlying(cTokenToSeizeSymbol)];

    // TODO get from lendingpool and uniswap
    const flashLoanRate = PARAMS.FLASHLOAN_RATE;
    const flashLoanFee = repayValue * flashLoanRate;
    const uniswapFeeRate = PARAMS.UNISWAP_FEE_RATE;
    const uniswapFee = uniswapFeeRate * repayValue;
    const otherFees = uniswapFee + flashLoanFee;

    const extraSlippageValue = PARAMS.SWAP_SLIPPAGE_RATIO * repayValue;
    const maxSpentOnSwappingBase = spentSeizedTokensBase
      .mul(BigNumber.from(PARAMS.SWAP_SLIPPAGE_FRACTION.NUM))
      .div(BigNumber.from(PARAMS.SWAP_SLIPPAGE_FRACTION.DENOM));

    const partialNetProfitFromLiquidationUsd =
      remainingSeizedTokensValue - otherFees - extraSlippageValue;
    if (
      maxSpentOnSwappingBase.gte(tokensSeizedBase) ||
      partialNetProfitFromLiquidationUsd <= 0
    ) {
      return null;
    }
    const gasUpperBound = BigNumber.from(
      PARAMS.COMP_LIQ_GAS_BOUND
    );
    const weiGasCostToLiquidate = gasUpperBound.mul(this.baseFee);
    const ethGasCostToLiquidate = Number.parseFloat(
      ethers.utils.formatEther(weiGasCostToLiquidate)
    );
    const dollarGasCostToLiquidate = ethGasCostToLiquidate * this.prices["ETH"];

    const netProfitFromLiquidation =
      partialNetProfitFromLiquidationUsd - dollarGasCostToLiquidate;

    if (netProfitFromLiquidation < this.minProfit) return null;
    return {
      cTokenBorrowed: ADDRS[cTokenToRepaySymbol],
      cTokenCollateral: ADDRS[cTokenToSeizeSymbol],
      tokenBorrowed: ADDRS[underlying(cTokenToRepaySymbol, true)],
      tokenCollateral:
        ADDRS[underlying(cTokenToSeizeSymbol, true)],
      borrower: user.id,
      repayAmount: repayAmountBase,
      maxSeizeTokens: maxSpentOnSwappingBase,
      gasLimit: gasUpperBound,
      baseFee: this.baseFee,
      netProfitGivenBaseFee: netProfitFromLiquidation,
    };
  }
}

module.exports = FindShortfallPositions