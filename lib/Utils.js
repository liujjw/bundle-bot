const { BigNumber, ethers } = require("ethers");
const _ = require("lodash");

const { ADDRS } = require("./Constants");

/**
 * 
 * @param {*} date 
 * @return {*}
 */
exports.getBlockNumberOnDate = async function (date) {
  const EthDater = require("ethereum-block-by-date");
  const ethers = require("ethers");
  const provider = new ethers.providers.CloudflareProvider();

  const dater = new EthDater(provider);
  return await dater.getDate(date);
};

/**
 * 
 * @param {*} ms 
 * @return {*}
 */
exports.sleep = function(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * 
 * @param {*} symbol 
 * @return {*}
 * @throws 
 */
exports.numDecimals = function (symbol) {
  switch (symbol) {
    case "WETH":
    case "DAI":
    case "BAT":
    case "UNI":
    case "ZRX":
    case "COMP":
    case "LINK":
    case "ETH":
    case "TUSD":
      return 18;
    case "USDC":
    case "USDT":
      return 6;
    case "WBTC":
      return 8;
    default:
      return new Error("symbol not found");
  }
};

/**
 * 
 * @param {*} scaledPrice 
 * @param {*} power 
 * @return {*}
 */
function bigNumToFloat(scaledPrice, power) {
  if (power === 18) {
    return scaledPrice.div(BigNumber.from(1e12)).toNumber() / 1e6;
  } else if (power === 6) {
    return scaledPrice.toNumber() / 1e6;
  } else if (power === 8) {
    return scaledPrice.toNumber() / 1e8;
  }
};

// TODO deprecate this in favor of something more accurate
exports.bigNumToFloat = bigNumToFloat;

/**
 * 
 * @param {*} obj 
 * @param {*} power 
 * @return {*}
 */
exports.bigNumsToFloats = function(obj, power) {
  const newObj = {};
  for (const key in obj) {
    newObj[key] = bigNumToFloat(obj[key], power);
  }
  return newObj;
};

/**
 * 
 * @param {*} bigD 
 * @return {*}
 */
exports.bigDecToFloat = function bigDecToFloat(bigD) {
  return Number.parseFloat(bigD);
};

/**
 * 
 * @param {*} ctoken 
 * @param {*} returnWeth 
 * @return {*}
 */
exports.underlying = function(ctoken, returnWeth = false) {
  if (ctoken === "cETH") return returnWeth ? "WETH" : "ETH";
  return ctoken.slice(1);
};

/**
 * 
 * @param {*} amount 
 * @param {*} symbol 
 * @return {*}
 * @throws
 */
exports.parseUnits = function parseUnits(amount, symbol) {
  // TODO use BigDecimal
  switch (symbol) {
    case "ETH":
    case "DAI":
    case "BAT":
    case "UNI":
    case "ZRX":
    case "TUSD":
    case "LINK":
    case "COMP":
    case "WETH":
      return ethers.utils.parseUnits(amount, 18);
    case "WBTC":
      const a = Number.parseFloat(amount) * 1e8;
      const b = Number.parseInt(a);
      return BigNumber.from(b);
    case "USDT":
    case "USDC":
      const c = Number.parseFloat(amount) * 1e6;
      const d = Number.parseInt(c);
      return BigNumber.from(d);
    default:
      return new Error("symbol not found");
  }
};

// TODO refactor with reverse obj, split up addrs into caddrs, erc20 addrs, etc
/**
 * 
 * @param {*} address 
 * @return {*}
 * @throws
 */
exports.cTokenSymbolOfAddress = function (address) {
  switch (address) {
    case ADDRS.cETH:
      return "cETH";
    case ADDRS.cDAI:
      return "cDAI";
    case ADDRS.cWBTC:
      return "cWBTC";
    case ADDRS.cBAT:
      return "cBAT";
    case ADDRS.cUNI:
      return "cUNI";
    case ADDRS.cUSDC:
      return "cUSDC";
    case ADDRS.cUSDT:
      return "cUSDT";
    case ADDRS.cZRX:
      return "cZRX";
    case ADDRS.cCOMP:
      return "cCOMP";
    case ADDRS.cLINK:
      return "cLINK";
    case ADDRS.cTUSD:
      return "cTUSD";
    default:
      return new Error("unknown ctoken address");
  }
};

/**
 * 
 * @param {*} addr 
 * @return {*}
 */
exports.offchainAggAddrToTicker = function (addr) {
  // copy
  addr = addr.toLowerCase();
  const offchainagg = ADDRS.OFFCHAIN_AGG;
  Object.keys(offchainagg).map((key) => {
    // set values to lowercased strings
    offchainagg[key] = offchainagg[key].toLowerCase();
  });
  // get map from lowercased addrs -> tickers
  return _.invert(offchainagg)[addr];
};
