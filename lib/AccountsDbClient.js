const { ENDPOINTS, ABIS, ADDRS } = require('./Constants');
const Utils = require('./Utils');

const { ethers } = require('hardhat');

const { createLogger, format, transports } = require('winston');
const fetch = require('node-fetch');
const redis = require('redis');
const { BigNumber } = require('ethers');

class AccountsDbClient {

    constructor(db, provider, priceFeedContract, comptrollerContract) {
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
            defaultMeta: { service: 'runner.js' },
            transports: [
                new transports.File({ filename: 'error.log', level: 'error'}),
                new transports.File({ filename: 'combined.log' }),
            ],
        });
        
        if (process.env.NODE_ENV !== 'production') {
            this.logger.add(new transports.Console({
                format: format.combine(
                format.colorize(),
                format.simple()
                ),
            }));
        }

        this.client = redis.createClient(db);
        this.client.on('error', (err) => logger.error('Redis createClient Error', err));

        this.provider = provider;
        this.anchoredPriceFeedContract = priceFeedContract;
        this.compoundComptrollerContract = comptrollerContract;

        this.cETH  = new ethers.Contract(ADDRS.cETH, ABIS.C_TOKEN, provider);
        this.cDAI  = new ethers.Contract(ADDRS.cDAI, ABIS.C_TOKEN, provider);
        this.cWBTC = new ethers.Contract(ADDRS.cWBTC, ABIS.C_TOKEN, provider);
        this.cBAT  = new ethers.Contract(ADDRS.cBAT, ABIS.C_TOKEN, provider);
        this.cUSDC = new ethers.Contract(ADDRS.cUSDC, ABIS.C_TOKEN, provider);
        this.cUSDT = new ethers.Contract(ADDRS.cUSDT, ABIS.C_TOKEN, provider);
        this.cUNI  = new ethers.Contract(ADDRS.cUNI, ABIS.C_TOKEN, provider);
        this.cZRX  = new ethers.Contract(ADDRS.cZRX, ABIS.C_TOKEN, provider);
        this.cCOMP = new ethers.Contract(ADDRS.cCOMP, ABIS.C_TOKEN, provider);
        this.cREP  = new ethers.Contract(ADDRS.cREP, ABIS.C_TOKEN, provider);
        this.cLINK = new ethers.Contract(ADDRS.cLINK, ABIS.C_TOKEN, provider);
        this.cTUSD  = new ethers.Contract(ADDRS.cTUSD, ABIS.C_TOKEN, provider);        
    }

    // BigNumber scaled by 1e18 
    async loadCollateralFactors() {
        return {
            cETH:  (await this.compoundComptrollerContract.markets(ADDRS.cETH))[1],
            cDAI:  (await this.compoundComptrollerContract.markets(ADDRS.cDAI))[1],
            cWBTC: (await this.compoundComptrollerContract.markets(ADDRS.cWBTC))[1], 
            cBAT:  (await this.compoundComptrollerContract.markets(ADDRS.cBAT))[1],
            cUNI:  (await this.compoundComptrollerContract.markets(ADDRS.cUNI))[1],
            cUSDC: (await this.compoundComptrollerContract.markets(ADDRS.cUSDC))[1],
            cUSDT: (await this.compoundComptrollerContract.markets(ADDRS.cUSDT))[1],
            cZRX:  (await this.compoundComptrollerContract.markets(ADDRS.cZRX))[1],
            cCOMP: (await this.compoundComptrollerContract.markets(ADDRS.cCOMP))[1],
            cREP:  (await this.compoundComptrollerContract.markets(ADDRS.cREP))[1],
            cSAI:  (await this.compoundComptrollerContract.markets(ADDRS.cSAI))[1],
            cLINK: (await this.compoundComptrollerContract.markets(ADDRS.cLINK))[1],
            cTUSD: (await this.compoundComptrollerContract.markets(ADDRS.cTUSD))[1]
        };
    }

    // BigNumber prices in USD scaled by a factor of 1e6
    async loadTokenPrices() {
        return {
            ETH:  await this.anchoredPriceFeedContract.price("ETH"), 
            DAI:  await this.anchoredPriceFeedContract.price("DAI"),
            BAT:  await this.anchoredPriceFeedContract.price("BAT"),
            UNI:  await this.anchoredPriceFeedContract.price("UNI"),
            WBTC: await this.anchoredPriceFeedContract.price("BTC"),
            ZRX:  await this.anchoredPriceFeedContract.price("ZRX"),
            COMP: await this.anchoredPriceFeedContract.price("COMP"),
            USDC: await this.anchoredPriceFeedContract.price("USDC"),
            USDT: await this.anchoredPriceFeedContract.price("USDT"),
            REP:  await this.anchoredPriceFeedContract.price("REP"),
            SAI:  await this.anchoredPriceFeedContract.price("DAI"),
            LINK: await this.anchoredPriceFeedContract.price("LINK"),
            TUSD: BigNumber.from("1000000") // 18 base units
        };
    }

    // BigNumber scaled by a factor of 1e(18-8+underlying token decimals) 
    async loadExchangeRates() {
        return {
            cETH:  await this.cETH.exchangeRateStored(),
            cDAI:  await this.cDAI.exchangeRateStored(),
            cWBTC: await this.cWBTC.exchangeRateStored(),
            cBAT:  await this.cBAT.exchangeRateStored(),
            cUSDC: await this.cUSDC.exchangeRateStored(),
            cUSDT: await this.cUSDT.exchangeRateStored(),
            cUNI:  await this.cUNI.exchangeRateStored(),
            cZRX:  await this.cZRX.exchangeRateStored(),
            cCOMP: await this.cCOMP.exchangeRateStored(),
            cREP:  await this.cREP.exchangeRateStored(),
            cLINK: await this.cLINK.exchangeRateStored(),
            cTUSD:  await this.cTUSD.exchangeRateStored(),
        };
    }

    async setCompoundParams() {
        await this.client.connect();
        // TODO multicall
        if(this.provider === undefined) 
            throw new Error("Undefined provider");
        let liquidationBonus = (await this.compoundComptrollerContract.liquidationIncentiveMantissa()).toString();
        let closeFactor = (await this.compoundComptrollerContract.closeFactorMantissa()).toString();
        let collateralFactors = await this.loadCollateralFactors();
        let prices = await this.loadTokenPrices();
        let exchangeRates = await this.loadExchangeRates();
        for(let cf in collateralFactors) {
            collateralFactors[cf] = collateralFactors[cf].toString();
        }
        collateralFactors = JSON.stringify(collateralFactors);
        for(let price in prices) {
            prices[price] = prices[price].toString();
        }
        prices = JSON.stringify(prices);
        for(let exchangeRateSymbol in exchangeRates) {
            exchangeRates[exchangeRateSymbol] = exchangeRates[exchangeRateSymbol].toString();
        }
        exchangeRates = JSON.stringify(exchangeRates);

        await this.client.set("liquidationBonus", liquidationBonus);
        await this.client.set("closeFactor", closeFactor);
        await this.client.set("collateralFactors", collateralFactors);
        await this.client.set("prices", prices);
        await this.client.set("exchangeRates", exchangeRates);
    }

    async fetchLatestSyncedBlockNumber() {
        let query = JSON.stringify({ query: 
            `{indexingStatusForCurrentVersion(subgraphName: "graphprotocol/compound-v2") { chains { latestBlock { hash number }}}}`
        });
        let res = await fetch(ENDPOINTS.THE_GRAPH, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: query
        });
        res = await res.json();
        return Number.parseInt(res.data.indexingStatusForCurrentVersion.chains[0].latestBlock.number);
    }

    // last is last user from a previous query to start after
    async fetchBatchOfAccounts(last, blockNumber) {
        let queryString = `query {
                accounts(block: {number: ${blockNumber}}, first: 1000, where: { hasBorrowed: true, id_gt: "${last}" }) {
                    id
                    health
                    tokens(first: 10) {
                        symbol
                        supplyBalanceUnderlying
                        borrowBalanceUnderlying
                        cTokenBalance
                        market {
                            exchangeRate
                            underlyingPrice
                        }
                    }
                }
            }`;
        
        let res = await fetch(ENDPOINTS.COMPOUND_SUBGRAPH, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({query: queryString})
        });
        let obj = await res.json();
        if (obj.data.accounts.length == 0) return null;
        return obj.data.accounts;
    }

    async setCompoundAccounts(blockNumber=undefined) {
        // requires minimal mined tx or other flashbots bots that cause or mitigate shortfall for accounts while fetching all the accounts at block b
        await this.client.connect();
        if (blockNumber === undefined) {
            blockNumber = await this.fetchLatestSyncedBlockNumber();
        }
        let accounts = [];
        let batch = await this.fetchBatchOfAccounts("", blockNumber);
        accounts = accounts.concat(batch);
        let lastID = batch[batch.length - 1].id;
        while(true) {
            batch = await this.fetchBatchOfAccounts(lastID, blockNumber);
            if (batch == null) break;
            lastID = batch[batch.length - 1].id;
            accounts = accounts.concat(batch);
        }

        let multi = this.client.multi();
        let keys = await this.client.keysAsync("account:*");
        multi.del(keys);
        for(const user of accounts) {
            let key = `account:${user.id}`; 
            multi.set(key, JSON.stringify(user));
        }
        multi.exec(error => {
            if (error !== null) throw error;
        });  
    }

    // specify hexdigit to get a chunk of all accounts starting with that hexdigit
    async getStoredCompoundAccounts(hexDigit=undefined) {            
        let users = [];
        let keyQueryString = 'account:*';
        if(hexDigit !== undefined) 
            keyQueryString = `account:0x${hexDigit}*`
        let keys = await this.client.keysAsync(keyQueryString);
        if(keys.length === 0)
            throw new Error("Accounts db empty");

        for(const key of keys) {
            let jsonStr = await this.client.getAsync(key);
            let obj = JSON.parse(jsonStr);
            users.push(obj);
        }
        return users;
    }

    /** 
     * @param {String} hexDigit specifies a hex prefitx
     * @method
     * @async
    */
    async getSickStoredCompoundAccounts(hexDigit=undefined, maxHealth=1.15) {
        // 15% max deviation at every price update per block? TODO tweak this
        let accs = await this.getStoredCompoundAccounts(hexDigit);
        return accs.filter(value => {
            let health = Utils.bigDecToFloat(value.health);
            return (health <= maxHealth && health >= 0.6) 
        });
    }

    async getStoredCompoundParams() {
        let liquidationBonus = BigNumber.from(await this.client.getAsync("liquidationBonus"));
        let closeFactor = BigNumber.from(await this.client.getAsync("closeFactor"));
        let collateralFactors = JSON.parse(await this.client.getAsync("collateralFactors"));
        let exchangeRates = JSON.parse(await this.client.getAsync("exchangeRates"));
        let prices = JSON.parse(await this.client.getAsync("prices"));
        for(let cf in collateralFactors) {
            collateralFactors[cf] = BigNumber.from(collateralFactors[cf]);
        }
        for(let price in prices) {
            prices[price] = BigNumber.from(prices[price]);
        }
        for(let symbol in exchangeRates) {
            exchangeRates[symbol] = BigNumber.from(exchangeRates[symbol]);
        }

        return {
            liquidationBonus: liquidationBonus,
            closeFactor: closeFactor,
            prices: prices,
            exchangeRates: exchangeRates,
            collateralFactors: collateralFactors
        };
    }

}

module.exports = AccountsDbClient;