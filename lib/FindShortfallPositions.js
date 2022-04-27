const { ethers } = require("hardhat");
const { BigNumber } = require("ethers");
const Uniswap = require("@uniswap/sdk");

const { ADDRS, PARAMS, ABIS } = require("./Constants");
const Utils = require("./Utils");
const { createLogger, format, transports } = require("winston");

/**
 * Computes Compound borrowers who can be liquidated.
 */
class FindShortfallPositions {
  /**
   * @constructor
   * @param {*} accounts
   * @param {*} params
   * @param {*} gasPrice
   * @param {*} provider
   */
  constructor(accounts, params, gasPrice, provider) {
    this.logger = createLogger({
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
      this.logger.add(
        new transports.Console({
          format: format.combine(format.colorize(), format.simple()),
        })
      );
    }

    this.accounts = accounts;
    // TODO parse params into a useable format such as native BigInt immediately
    // after being fetched as string from the db
    this.prices = Utils.bigNumsInObjToFloats(params.prices, 6);
    this.exchangeRates = params.exchangeRates;
    this.collateralFactors = Utils.bigNumsInObjToFloats(
      params.collateralFactors,
      18
    );
    this.liquidationBonus = Utils.bigNumToFloat(params.liquidationBonus, 18);
    this.closeFactor = Utils.bigNumToFloat(params.closeFactor, 18);

    this.gasPrice = gasPrice;

    this.provider = provider;
    this.comptroller = new ethers.Contract(
      ADDRS.COMPOUND_COMPTROLLER,
      ABIS.COMPOUND_COMPTROLLER,
      provider
    );

    this.minProfit = PARAMS.MIN_LIQ_PROFIT;
    this.chainId = Uniswap.ChainId.MAINNET;
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
      this.closeFactor = Utils.bigNumToFloat(newValue.value, 18);
    } else if (type == "liquidationIncentive") {
      this.liquidationIncentive = Utils.bigNumToFloat(newValue.value, 18);
    } else if (type == "price") {
      this.prices[newValue.ticker] = Utils.bigNumToFloat(newValue.value, 8);
    } else if (type == "collateralFactor") {
      this.collateralFactors[newValue.id] = Utils.bigNumToFloat(
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
        this.logger.error(`error processing user id ${user.id} ${e}`);
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
      const amount = Utils.bigDecToFloat(curToken.supplyBalanceUnderlying);
      const price = this.prices[Utils.underlyingOfCToken(curToken.symbol)];
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
      const amount = Utils.bigDecToFloat(curToken.borrowBalanceUnderlying);
      const price = this.prices[Utils.underlyingOfCToken(curToken.symbol)];
      const value = amount * price;
      return curValue + value;
    }, 0);

    if (curBorrowValue <= maxBorrowValue) {
      return false;
    }
  }

  /**
   * 
   * @param {*} user 
   * @return {*}
   */
  calculateCollateralData(user) {
    return user.tokens.reduce(
      ([curIndexOfHighest, curHighest], curToken, curIndex) => {
        if (
          curToken.symbol == cTokenToRepaySymbol ||
          curToken.symbol == "cUSDT"
        ) {
          return [curIndexOfHighest, curHighest];
        }

        const price = this.prices[Utils.underlyingOfCToken(curToken.symbol)];
        const amount = Utils.bigDecToFloat(curToken.supplyBalanceUnderlying);
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
        const price = this.prices[Utils.underlyingOfCToken(curToken.symbol)];
        const amount = Utils.bigDecToFloat(curToken.borrowBalanceUnderlying);
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
   * @return {*}
   */
  async calculateUniswapData(
    cTokenToSeizeSymbol, 
    cTokenToRepaySymbol,
    tokensSeizedBase) {
    const uniswapTokenSeized = new Uniswap.Token(
      this.chainId,
      ADDRS[Utils.underlyingOfCToken(cTokenToSeizeSymbol, true)],
      Utils.numDecimals(Utils.underlyingOfCToken(cTokenToSeizeSymbol, true))
    );
    const uniswapTokenRepaid = new Uniswap.Token(
      this.chainId,
      ADDRS[Utils.underlyingOfCToken(cTokenToRepaySymbol, true)],
      Utils.numDecimals(Utils.underlyingOfCToken(cTokenToRepaySymbol, true))
    );
    let spentSeizedTokensBaseTA;
    
    // the seized repay pair eth/x or x/eth
    if (cTokenToSeizeSymbol === "cETH" || cTokenToRepaySymbol === "cETH") {
      let seizedRepaidPath;
      if (this.uniswapPairDataCache
        .has([cTokenToRepaySymbol, cTokenToSeizeSymbol])) {
        seizedRepaidPath = this.uniswapPairDataCache
                  .get([cTokenToRepaySymbol, cTokenToSeizeSymbol]);
      } else {
        seizedRepaidPath = await Uniswap.Fetcher.fetchPairData(
          uniswapTokenRepaid,
          uniswapTokenSeized,
          this.provider
        );
        this.uniswapPairDataCache
          .set([cTokenToRepaySymbol, cTokenToSeizeSymbol], seizedRepaidPath);
      }

      const route = new Uniswap.Route([seizedRepaidPath], uniswapTokenSeized);
      const trade = new Uniswap.Trade(
        route,
        new Uniswap.TokenAmount(uniswapTokenRepaid, repayAmountBase.toString()),
        Uniswap.TradeType.EXACT_OUTPUT
      );
      spentSeizedTokensBaseTA = trade.inputAmount;
    } else {
      // TODO find a better path
      throw new Error("unsupported");
      const uniswapWeth = new Uniswap.Token(
        this.chainId,
        ADDRS["WETH"],
        Utils.numDecimals("WETH")
      );
      const wethInput = await Uniswap.Fetcher.fetchPairData(
        uniswapWeth,
        uniswapTokenSeized,
        this.provider
      );
      const outputWeth = await Uniswap.Fetcher.fetchPairData(
        uniswapTokenRepaid,
        uniswapWeth,
        this.provider
      );
      const route = new Uniswap.Route(
        [wethInput, outputWeth],
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
      return [new Error("spent more tokens on swap than seized tokens"), 
      null, null];
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
    console.log('hio')
    return [null, spentSeizedTokensBase, remainingSeizedTokensScaled];

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
    ] = this.calculateCollateralData(user);
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
      Utils.bigDecToFloat(
        user.tokens[indexOfTokenWithHighestBorrowBalanceValue]
          .borrowBalanceUnderlying
      );
    const repayAmountBase = Utils.parseUnitsHelper(
      repayAmountScaled.toString(),
      Utils.underlyingOfCToken(cTokenToRepaySymbol)
    );
    const repayPrice =
      this.prices[Utils.underlyingOfCToken(cTokenToRepaySymbol)];
    const repayValue = repayPrice * repayAmountScaled;

    const [error, cTokensSeizedBase] =
      await this.comptroller.liquidateCalculateSeizeTokens(
        ADDRS[cTokenToRepaySymbol],
        ADDRS[cTokenToSeizeSymbol],
        repayAmountBase
      );
    if (error.toNumber() !== 0) {
      return null;
      throw new Error("comptroller liquidateCalculateSeizeTokens failed");
    }
    // TODO does not account for interest accumulation + onchain data
    const exchangeRateBase = this.exchangeRates[cTokenToSeizeSymbol];
    // TODO maybe in the future not all ctokens have 8 decimals
    const exchangeRateScaleFactor = BigNumber.from(10).pow(
      18 - 8 + Utils.numDecimals(Utils.underlyingOfCToken(cTokenToSeizeSymbol))
    );
    const tokensSeizedBase = exchangeRateBase
      .mul(cTokensSeizedBase)
      .div(exchangeRateScaleFactor);

    const [error2, spentSeizedTokensBase, remainingSeizedTokensScaled] = 
      await this.calculateUniswapData(cTokenToSeizeSymbol, 
        cTokenToRepaySymbol, tokensSeizedBase);
    // TOOD throw errors
    if (error2 != null) {
      return null;
      // throw error2;
    }
    const remainingSeizedTokensValue =
      remainingSeizedTokensScaled *
      this.prices[Utils.underlyingOfCToken(cTokenToSeizeSymbol)];

    // TODO get from lendingpool and uniswap
    const flashLoanRate = PARAMS.FLASHLOAN_RATE;
    const flashLoanFee = repayValue * flashLoanRate;
    const uniswapFeeRate = PARAMS.UNISWAP_FEE_RATE;
    const uniswapFee = uniswapFeeRate * repayValue;
    const otherFees = uniswapFee + flashLoanFee;

    const extraSlippagePercent = 0.005;
    const extraSlippageNum = 1005;
    const extraSlippageDenom = 1000;
    const extraSlippageValue = extraSlippagePercent * repayValue;
    const maxSpentOnSwappingBase = spentSeizedTokensBase
      .mul(BigNumber.from(extraSlippageNum))
      .div(BigNumber.from(extraSlippageDenom));

    const partialNetProfitFromLiquidationUsd =
      remainingSeizedTokensValue - otherFees - extraSlippageValue;
    if (
      maxSpentOnSwappingBase.gte(tokensSeizedBase) ||
      partialNetProfitFromLiquidationUsd <= 0
    )
      return null;

    const gasUpperBoundLimit = BigNumber.from(
      PARAMS.LIQUIDATION_GAS_UPPER_BOUND
    );
    const weiGasCostToLiquidate = gasUpperBoundLimit.mul(this.gasPrice);
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
      tokenBorrowed: ADDRS[Utils.underlyingOfCToken(cTokenToRepaySymbol, true)],
      tokenCollateral:
        ADDRS[Utils.underlyingOfCToken(cTokenToSeizeSymbol, true)],
      borrower: user.id,
      repayAmount: repayAmountBase,
      maxSeizeTokens: maxSpentOnSwappingBase,
      gasLimit: gasUpperBoundLimit,
      gasPrice: this.gasPrice,
      netProfitFromLiquidationGivenGasPrice: netProfitFromLiquidation,
    };
  }
}

module.exports = FindShortfallPositions