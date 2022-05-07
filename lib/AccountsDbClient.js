const { ENDPOINTS, ABIS, ADDRS } = require("./Constants");
const Utils = require("./Utils");
const EventEmitter = require("events");

const { ethers } = require("ethers");

const fetch = require("node-fetch");
const redis = require("redis");
const { BigNumber } = require("ethers");

/**
 * 
 */
class AccountsDbClient {
  /**
   * 
   * @param {*} db 
   * @param {*} provider 
   */
  constructor(db, provider=null) {
    this.hasInit = false;
    
    this.client = redis.createClient(db);
    this.client.on("error", (err) => {
      throw new Error(`Redis error ${err}`);
    });

    this.provider = provider;
    this.anchoredPriceFeedContract = new ethers.Contract(
      ADDRS.UNISWAP_ANCHORED_VIEW,
      ABIS.UNISWAP_ANCHORED_VIEW,
      this.provider
    );
    this.compoundComptrollerContract = new ethers.Contract(
      ADDRS.COMPOUND_COMPTROLLER,
      ABIS.COMPOUND_COMPTROLLER,
      this.provider
    );

    this.cETH = new ethers.Contract(ADDRS.cETH, ABIS.C_TOKEN, provider);
    this.cDAI = new ethers.Contract(ADDRS.cDAI, ABIS.C_TOKEN, provider);
    this.cWBTC = new ethers.Contract(ADDRS.cWBTC, ABIS.C_TOKEN, provider);
    this.cBAT = new ethers.Contract(ADDRS.cBAT, ABIS.C_TOKEN, provider);
    this.cUSDC = new ethers.Contract(ADDRS.cUSDC, ABIS.C_TOKEN, provider);
    this.cUSDT = new ethers.Contract(ADDRS.cUSDT, ABIS.C_TOKEN, provider);
    this.cUNI = new ethers.Contract(ADDRS.cUNI, ABIS.C_TOKEN, provider);
    this.cZRX = new ethers.Contract(ADDRS.cZRX, ABIS.C_TOKEN, provider);
    this.cCOMP = new ethers.Contract(ADDRS.cCOMP, ABIS.C_TOKEN, provider);
    this.cREP = new ethers.Contract(ADDRS.cREP, ABIS.C_TOKEN, provider);
    this.cLINK = new ethers.Contract(ADDRS.cLINK, ABIS.C_TOKEN, provider);
    this.cTUSD = new ethers.Contract(ADDRS.cTUSD, ABIS.C_TOKEN, provider);
  }

  /**
   * 
   */
  async init() {
    if (!this.hasInit) {
      this.hasInit = true;
      await this.client.connect();
    }
  }

  /**
   * @return {*}
   */
  async loadCollateralFactors() {
    // BigNumber scaled by 1e18
    return {
      cETH: (await this.compoundComptrollerContract.markets(ADDRS.cETH))[1],
      cDAI: (await this.compoundComptrollerContract.markets(ADDRS.cDAI))[1],
      cWBTC: (await this.compoundComptrollerContract.markets(ADDRS.cWBTC))[1],
      cBAT: (await this.compoundComptrollerContract.markets(ADDRS.cBAT))[1],
      cUNI: (await this.compoundComptrollerContract.markets(ADDRS.cUNI))[1],
      cUSDC: (await this.compoundComptrollerContract.markets(ADDRS.cUSDC))[1],
      cUSDT: (await this.compoundComptrollerContract.markets(ADDRS.cUSDT))[1],
      cZRX: (await this.compoundComptrollerContract.markets(ADDRS.cZRX))[1],
      cCOMP: (await this.compoundComptrollerContract.markets(ADDRS.cCOMP))[1],
      cREP: (await this.compoundComptrollerContract.markets(ADDRS.cREP))[1],
      cSAI: (await this.compoundComptrollerContract.markets(ADDRS.cSAI))[1],
      cLINK: (await this.compoundComptrollerContract.markets(ADDRS.cLINK))[1],
      cTUSD: (await this.compoundComptrollerContract.markets(ADDRS.cTUSD))[1],
    };
  }

  /**
   * 
   * @return {*}
   */
  async loadTokenPrices() {
    // BigNumber prices in USD scaled by a factor of 1e6
    return {
      ETH: await this.anchoredPriceFeedContract.price("ETH"),
      DAI: await this.anchoredPriceFeedContract.price("DAI"),
      BAT: await this.anchoredPriceFeedContract.price("BAT"),
      UNI: await this.anchoredPriceFeedContract.price("UNI"),
      WBTC: await this.anchoredPriceFeedContract.price("BTC"),
      ZRX: await this.anchoredPriceFeedContract.price("ZRX"),
      COMP: await this.anchoredPriceFeedContract.price("COMP"),
      USDC: await this.anchoredPriceFeedContract.price("USDC"),
      USDT: await this.anchoredPriceFeedContract.price("USDT"),
      REP: await this.anchoredPriceFeedContract.price("REP"),
      SAI: await this.anchoredPriceFeedContract.price("DAI"),
      LINK: await this.anchoredPriceFeedContract.price("LINK"),
      TUSD: BigNumber.from("1000000"), // 18 base units
    };
  }

  /**
   * 
   * @return {*}
   */
  async loadExchangeRates() {
    // BigNumber scaled by a factor of 1e(18-8+underlying token decimals)
    return {
      cETH: await this.cETH.exchangeRateStored(),
      cDAI: await this.cDAI.exchangeRateStored(),
      cWBTC: await this.cWBTC.exchangeRateStored(),
      cBAT: await this.cBAT.exchangeRateStored(),
      cUSDC: await this.cUSDC.exchangeRateStored(),
      cUSDT: await this.cUSDT.exchangeRateStored(),
      cUNI: await this.cUNI.exchangeRateStored(),
      cZRX: await this.cZRX.exchangeRateStored(),
      cCOMP: await this.cCOMP.exchangeRateStored(),
      cREP: await this.cREP.exchangeRateStored(),
      cLINK: await this.cLINK.exchangeRateStored(),
      cTUSD: await this.cTUSD.exchangeRateStored(),
    };
  }

  /**
   * 
   */
  async setCompoundParams() {
    // TODO multicall
    if (this.provider === undefined) {
      throw new Error("Undefined provider");
    }
    const liquidationBonus = (
      await this.compoundComptrollerContract.liquidationIncentiveMantissa()
    ).toString();
    const closeFactor = (
      await this.compoundComptrollerContract.closeFactorMantissa()
    ).toString();
    let collateralFactors = await this.loadCollateralFactors();
    let prices = await this.loadTokenPrices();
    let exchangeRates = await this.loadExchangeRates();
    for (const cf in collateralFactors) {
      collateralFactors[cf] = collateralFactors[cf].toString();
    }
    collateralFactors = JSON.stringify(collateralFactors);
    for (const price in prices) {
      prices[price] = prices[price].toString();
    }
    prices = JSON.stringify(prices);
    for (const exchangeRateSymbol in exchangeRates) {
      exchangeRates[exchangeRateSymbol] =
        exchangeRates[exchangeRateSymbol].toString();
    }
    exchangeRates = JSON.stringify(exchangeRates);

    await this.client.set("liquidationBonus", liquidationBonus);
    await this.client.set("closeFactor", closeFactor);
    await this.client.set("collateralFactors", collateralFactors);
    await this.client.set("prices", prices);
    await this.client.set("exchangeRates", exchangeRates);
  }

  /**
   * 
   * @return {*}
   */
  async fetchLatestSyncedBlockNumber() {
    const query = JSON.stringify({
      query: `{indexingStatusForCurrentVersion(subgraphName: "graphprotocol/compound-v2") { chains { latestBlock { hash number }}}}`,
    });
    let res = await fetch(ENDPOINTS.THE_GRAPH, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: query,
    });
    res = await res.json();
    return Number.parseInt(
      res.data.indexingStatusForCurrentVersion.chains[0].latestBlock.number
    );
  }

  /**
   * 
   * @param {*} last 
   * @param {*} blockNumber 
   * @return {*}
   */
  async fetchBatchOfAccounts(last, blockNumber) {
    // last is last user from a previous query to start after
    const queryString = `query {
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

    const res = await fetch(ENDPOINTS.COMPOUND_SUBGRAPH, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: queryString }),
    });
    const obj = await res.json();
    if (obj.data.accounts.length == 0) return null;
    return obj.data.accounts;
  }

  /**
   * 
   * @param {*} blockNumber 
   * @param {*} onlySickAccounts 
   * @param {*} maxHealth 
   * @param {*} minHealth 
   */
  async setCompoundAccounts(
    blockNumber = undefined, 
    onlySickAccounts = true, 
    maxHealth = 1.15,
    minHealth = 0.2
  ) {
    if (blockNumber === undefined) {
      blockNumber = await this.fetchLatestSyncedBlockNumber();
    }

    let totalAccounts = 0;
    let totalSickAccounts = 0;
    let totalBatches = 0;
    
    // TODO batches are not he same size after filtering
    let lastID = "";
    while (true) {
      let batch = await this.fetchBatchOfAccounts(lastID, blockNumber);
      if (batch == null || batch.length == 0) break;
      lastID = batch[batch.length - 1].id;
      totalAccounts += batch.length;
      totalBatches += 1;
      if (onlySickAccounts) {
        batch = batch.filter((value) => {
          const health = Utils.bigDecToFloat(value.health);
          return health <= maxHealth && health > minHealth;
        });
        totalSickAccounts += batch.length;
      }
      const setIndexKey = `${totalBatches - 1}`;
      // TODO clear the whole acc db instead to not have any stale data
      await this.client.del(setIndexKey);
      for (const user of batch) {
        await this.client.sAdd(setIndexKey, JSON.stringify(user));
      }
    }
    await this.client.set("totalAccounts", totalAccounts);
    await this.client.set("totalSickAccounts", totalSickAccounts);
    await this.client.set("totalBatches", totalBatches);
  }

  /**
   * 
   * @param {*} chunkIndex 
   * @param {*} splitFactor 
   * @return {*}
   */
  async getStoredCompoundAccounts(chunkIndex=undefined, splitFactor=undefined) {
    const users = [];
    const totalBatches = await this.client.get("totalBatches");
    if (chunkIndex === undefined || splitFactor === undefined) {
      for (let i = 0; i < totalBatches; i++) {
        const batch = await this.client.sMembers(i.toString());
        for (const user of batch) {
          users.push(JSON.parse(user));
        }
      }
    } else {
      const totalBatches = await this.client.get("totalBatches");
      const numBatches = Math.ceil(totalBatches / splitFactor);
      const startBatchIndex = chunkIndex * numBatches;
      const endBatchIndex = Math.min(startBatchIndex + numBatches, totalBatches);
      for (let i = startBatchIndex; i < endBatchIndex; i++) {
        const batch = await this.client.sMembers(i.toString())
        for (const user of batch) {
          users.push(JSON.parse(user));
        }
      }
    }
    return users;
  }

  /**
   * 
   * @return {*}
   */
  async getStoredCompoundParams() {
    const liquidationBonus = BigNumber.from(
      await this.client.get("liquidationBonus")
    );
    const closeFactor = BigNumber.from(await this.client.get("closeFactor"));
    const collateralFactors = JSON.parse(
      await this.client.get("collateralFactors")
    );
    const exchangeRates = JSON.parse(await this.client.get("exchangeRates"));
    const prices = JSON.parse(await this.client.get("prices"));
    for (const cf in collateralFactors) {
      collateralFactors[cf] = BigNumber.from(collateralFactors[cf]);
    }
    for (const price in prices) {
      prices[price] = BigNumber.from(prices[price]);
    }
    for (const symbol in exchangeRates) {
      exchangeRates[symbol] = BigNumber.from(exchangeRates[symbol]);
    }

    return {
      liquidationBonus: liquidationBonus,
      closeFactor: closeFactor,
      prices: prices,
      exchangeRates: exchangeRates,
      collateralFactors: collateralFactors,
    };
  }
}

module.exports = AccountsDbClient;
