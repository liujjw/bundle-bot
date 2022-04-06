const { ethers } = require("hardhat");
const { BigNumber } = require("ethers");
const Uniswap = require('@uniswap/sdk');

const { ADDRS, TX_CONST, ABIS } = require('./Constants');
const Utils = require('./Utils');
const winston = require('winston');

class FindShortfallPositions {
    constructor(
        accounts, 
        params,
        gasPrice,
        provider
    ) {
        this.logger = winston.createLogger({
            level: 'info',
            format: format.combine(
                format.timestamp({
                  format: 'YYYY-MM-DD HH:mm:ss'
                }),
                format.errors({ stack: true }),
                format.splat(),
                format.json()
            ),
            defaultMeta: { service: 'stalker.js' },
            transports: [
                new winston.transports.File({ filename: 'error.log', level: 'error'}),
                new winston.transports.File({ filename: 'combined.log' }),
            ],
        });
        
        if (process.env.NODE_ENV !== 'production') {
            logger.add(new winston.transports.Console({
              format: format.combine(
                format.colorize(),
                format.simple()
              ),
            }));
        }
        
        this.accounts = accounts;
        // UPDATE parse params into a useable format such as native BigInt immediately after being fetched as string from the db
        this.prices = Utils.bigNumsInObjToFloats(params.prices, 6);
        this.exchangeRates = params.exchangeRates;
        this.collateralFactors = Utils.bigNumsInObjToFloats(params.collateralFactors, 18);
        this.liquidationBonus = Utils.bigNumToFloat(params.liquidationBonus, 18);
        this.closeFactor = Utils.bigNumToFloat(params.closeFactor, 18); 

        this.gasPrice = gasPrice;
        
        this.provider = provider;
        this.comptroller = new ethers.Contract(ADDRS.COMPOUND_COMPTROLLER, ABIS.COMPOUND_COMPTROLLER, provider);

        this.minProfit = TX_CONST.MIN_LIQ_PROFIT;
        this.chainId = Uniswap.ChainId.MAINNET;
    }

    setParam(type, newValue) {
        if(type === "closeFactor") {
            this.closeFactor = Utils.bigNumToFloat(newValue.value, 18);
        } else if(type == "liquidationIncentive") {
            this.liquidationIncentive = Utils.bigNumToFloat(newValue.value, 18);
        } else if(type == "price") {
            this.prices[newValue.ticker] = Utils.bigNumToFloat(newValue.value, 8);
        } else if(type == "collateralFactor") {
            this.collateralFactors[newValue.id] = Utils.bigNumToFloat(newValue.value, 18);
        }
    }

    async getLiquidationTxs() {
        let liquidationTxs = [];
        for(const user of this.accounts) {
            try {
                let liquidationTx = await this.getLiquidationTx(user);
                if (liquidationTx !== null) {
                    liquidationTxs.push(liquidationTx);
                }
            } catch (e) {
                console.error("error processing", user.id, e);
            }
        }
        return liquidationTxs;
    }

    async getLiquidationTx(user) {
        // also i need to go offline at strategic times
        // only let it kick in when we observe 
        // analyze the direction of the price is going down 
        // like the moving averages 
        // run a chainlink node myself 
        // look at coinbase data
        // look at uniswap data

        // deprecated tokens
        user.tokens = user.tokens.filter(token => 
            token.symbol != "cREP" && token.symbol != "cSAI");

        let maxBorrowValue = user.tokens.reduce((curValue, curToken) => {
            let amount = Utils.bigDecToFloat(curToken.supplyBalanceUnderlying);
            let price = this.prices[Utils.underlyingOfCToken(curToken.symbol)];
            let value = amount * price;
            return curValue + (value * this.collateralFactors[curToken.symbol]);
        }, 0);
        let curBorrowValue = user.tokens.reduce((curValue, curToken) => {
            // cannot be used as collateral
            if(
                curToken.symbol === "cUSDT" || 
                curToken.symbol === "cLINK" || 
                curToken.symbol === "cTUSD"
            ) return curValue;
            let amount = Utils.bigDecToFloat(curToken.borrowBalanceUnderlying);
            let price = this.prices[Utils.underlyingOfCToken(curToken.symbol)];
            let value = amount * price;
            return curValue + value;
        }, 0);

        if(curBorrowValue <= maxBorrowValue)
            return null;
        // console.log(user.health, "cur", curBorrowValue, "max", maxBorrowValue);   

        // 63.15789% success rate
        // let health = Utils.bigDecToFloat(user.health);
        // if(health >= 0.99)
        //     return null;

        let [indexOfTokenWithHighestBorrowBalanceValue, 
        valueOfTokenWithHighestBorrowBalance] = user.tokens.reduce(
            ([curIndexOfHighest, curHighest], curToken, curIndex) => {
            let price = this.prices[Utils.underlyingOfCToken(curToken.symbol)];
            let amount = Utils.bigDecToFloat(curToken.borrowBalanceUnderlying);
            let curTokenBorrowValue = price * amount;  
            if (curTokenBorrowValue > curHighest) {
                return [curIndex, curTokenBorrowValue];
            } else {
                return [curIndexOfHighest, curHighest];
            }
        }, [0,0]);
        if(valueOfTokenWithHighestBorrowBalance <= this.minProfit * 2) return null;
        let cTokenToRepaySymbol = user.tokens[indexOfTokenWithHighestBorrowBalanceValue].symbol;
        // usdt cant be collateral
        // user.tokens = user.tokens.filter((token) => token.symbol != "cUSDT");
        let [indexOfTokenWithHighestCollateralBalanceValue, valueOfTokenWithHighestCollateralBalance] = user.tokens.reduce(
            ([curIndexOfHighest, curHighest], curToken, curIndex) => {
            if (curToken.symbol == cTokenToRepaySymbol || curToken.symbol == "cUSDT") return [curIndexOfHighest, curHighest];
    
            let price = this.prices[Utils.underlyingOfCToken(curToken.symbol)];
            let amount = Utils.bigDecToFloat(curToken.supplyBalanceUnderlying);
            let curTokenSupplyValue = price * amount;  
            if (curTokenSupplyValue > curHighest) {
                return [curIndex, curTokenSupplyValue];
            } else {
                return [curIndexOfHighest, curHighest];
            }
        }, [0,0]);
        if(valueOfTokenWithHighestCollateralBalance <= this.minProfit * 2) return null;
        let cTokenToSeizeSymbol = user.tokens[indexOfTokenWithHighestCollateralBalanceValue].symbol;

        // compound will not let seize if not enough collateral but still profit
        // let seizeValue = Math.min(this.liquidationBonus * repayValue, valueOfTokenWithHighestCollateralBalance);
        if (valueOfTokenWithHighestCollateralBalance <= this.closeFactor * valueOfTokenWithHighestBorrowBalance * this.liquidationBonus) return null;
        
        let repayAmountScaled = this.closeFactor * Utils.bigDecToFloat(
            user.tokens[indexOfTokenWithHighestBorrowBalanceValue].borrowBalanceUnderlying
        );
        let repayAmountBase = Utils.parseUnitsHelper(repayAmountScaled.toString(), Utils.underlyingOfCToken(cTokenToRepaySymbol));
        let repayPrice = this.prices[Utils.underlyingOfCToken(cTokenToRepaySymbol)];
        let repayValue = repayPrice * repayAmountScaled;

        let [error, cTokensSeizedBase] = await this.comptroller.liquidateCalculateSeizeTokens(ADDRS[cTokenToRepaySymbol], ADDRS[cTokenToSeizeSymbol], repayAmountBase);
        if(error.toNumber() !== 0) return null;

        // offchain because we need to know profit first, however onchain is more up to date
        // UPDATE does not account for interest accumulation
        let exchangeRateBase = this.exchangeRates[cTokenToSeizeSymbol];

        // UPDATE maybe in the future not all ctokens have 8 decimals
        let exchangeRateScaleFactor = BigNumber.from(10).pow(18 - 8 + Utils.numDecimals(Utils.underlyingOfCToken(cTokenToSeizeSymbol)));
        let tokensSeizedBase = exchangeRateBase.mul(cTokensSeizedBase).div(exchangeRateScaleFactor);

        const uniswapTokenSeized = 
            new Uniswap.Token(this.chainId, ADDRS[Utils.underlyingOfCToken(cTokenToSeizeSymbol, true)], Utils.numDecimals(Utils.underlyingOfCToken(cTokenToSeizeSymbol, true)));
        const uniswapTokenRepaid = 
            new Uniswap.Token(this.chainId, ADDRS[Utils.underlyingOfCToken(cTokenToRepaySymbol, true)], Utils.numDecimals(Utils.underlyingOfCToken(cTokenToRepaySymbol, true)));
        let spentSeizedTokensBaseTA;
        if(
            cTokenToSeizeSymbol === "cETH" || 
            cTokenToRepaySymbol === "cETH"
        ) {
            const seizedRepaidPath = await Uniswap.Fetcher.fetchPairData(uniswapTokenRepaid, uniswapTokenSeized, this.provider);
        
            const route = new Uniswap.Route([seizedRepaidPath], uniswapTokenSeized); 
            const trade = new Uniswap.Trade(
                route, 
                new Uniswap.TokenAmount(uniswapTokenRepaid, repayAmountBase.toString()), 
                Uniswap.TradeType.EXACT_OUTPUT
            );
            spentSeizedTokensBaseTA = trade.inputAmount;
        } else {
            const uniswapWeth = new Uniswap.Token(this.chainId, ADDRS['WETH'], Utils.numDecimals("WETH"));
            const wethInput = await Uniswap.Fetcher.fetchPairData(uniswapWeth, uniswapTokenSeized, this.provider);
            const outputWeth = await Uniswap.Fetcher.fetchPairData(uniswapTokenRepaid, uniswapWeth, this.provider);
            const route = new Uniswap.Route([wethInput, outputWeth], uniswapTokenSeized, uniswapTokenRepaid);
            const trade = new Uniswap.Trade(
                route, 
                new Uniswap.TokenAmount(uniswapTokenRepaid, repayAmountBase.toString()),
                Uniswap.TradeType.EXACT_OUTPUT
            );
            spentSeizedTokensBaseTA = trade.inputAmount;
        }        
        let tokensSeizedBaseTA = new Uniswap.TokenAmount(uniswapTokenSeized, tokensSeizedBase.toString());

        let spentSeizedTokensBase = BigNumber.from(spentSeizedTokensBaseTA.raw.toString()); 
        if (spentSeizedTokensBase.gte(tokensSeizedBase))
            return null;
        let remainingSeizedTokensTA = tokensSeizedBaseTA.subtract(spentSeizedTokensBaseTA);
        let remainingSeizedTokensScaled = Number.parseFloat(remainingSeizedTokensTA.toFixed(6)); 
        // console.log(uniswapTokenSeized, tokensSeizedBase.toString(), remainingSeizedTokensScaled, spentSeizedTokensBaseTA.raw.toString());

        if (remainingSeizedTokensScaled <= 0) return null;
        let remainingSeizedTokensValue = remainingSeizedTokensScaled * this.prices[Utils.underlyingOfCToken(cTokenToSeizeSymbol)];

        // UPDATE get from lendingpool and uniswap
        let flashLoanRate = 0.0009;
        let flashLoanFee = repayValue * flashLoanRate;
        let uniswapFeeRate = 0.003;
        let uniswapFee = uniswapFeeRate * repayValue;
        let otherFees = uniswapFee + flashLoanFee;
        
        let extraSlippagePercent = 0.005;
        let extraSlippageNum = 1005;
        let extraSlippageDenom = 1000;
        let extraSlippageValue = extraSlippagePercent * repayValue;
        let maxSpentOnSwappingBase = spentSeizedTokensBase.mul(BigNumber.from(extraSlippageNum)).div(BigNumber.from(extraSlippageDenom));

        let partialNetProfitFromLiquidationUsd = remainingSeizedTokensValue - otherFees - extraSlippageValue;
        if (
            maxSpentOnSwappingBase.gte(tokensSeizedBase) 
            || partialNetProfitFromLiquidationUsd <= 0
        ) return null;

        let gasUpperBoundLimit = BigNumber.from(TX_CONST.LIQUIDATION_GAS_UPPER_BOUND);
        let weiGasCostToLiquidate = gasUpperBoundLimit.mul(this.gasPrice);
        let ethGasCostToLiquidate = Number.parseFloat(ethers.utils.formatEther(weiGasCostToLiquidate));
        let dollarGasCostToLiquidate = ethGasCostToLiquidate * this.prices["ETH"];
        
        let netProfitFromLiquidation = partialNetProfitFromLiquidationUsd - dollarGasCostToLiquidate;

        if (netProfitFromLiquidation < this.minProfit) return null;

        // FEATURE simulate what price(s) it would take to liquidate and log them

        return {
            cTokenBorrowed: ADDRS[cTokenToRepaySymbol],
            cTokenCollateral: ADDRS[cTokenToSeizeSymbol],
            tokenBorrowed: ADDRS[Utils.underlyingOfCToken(cTokenToRepaySymbol), true],
            tokenCollateral: ADDRS[Utils.underlyingOfCToken(cTokenToSeizeSymbol, true)],
            borrower: user.id,
            repayAmount: repayAmountBase,
            maxSeizeTokens: maxSpentOnSwappingBase,
            gasLimit: gasUpperBoundLimit,
            gasPrice: this.gasPrice,
            netProfitFromLiquidationGivenGasPrice: netProfitFromLiquidation
        }
    }
}


module.exports = FindShortfallPositions;