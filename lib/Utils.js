const { BigNumber, ethers } = require("ethers");
const _ = require("lodash");

const { ADDRS } = require("./Constants");

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
      throw new Error("symbol not found");
  }
};

// TODO deprecate this in favor of something more accurate
exports.bigNumToFloat = function bigNumToFloat(scaledPrice, power) {
  if (power === 18) {
    return scaledPrice.div(BigNumber.from(1e12)).toNumber() / 1e6;
  } else if (power === 6) {
    return scaledPrice.toNumber() / 1e6;
  } else if (power === 8) {
    return scaledPrice.toNumber() / 1e8;
  }
};

exports.bigNumsInObjToFloats = function bigNumsInObjToFloats(obj, power) {
  let newObj = {};
  for (let key in obj) {
    newObj[key] = this.bigNumToFloat(obj[key], power);
  }
  return newObj;
};

exports.bigDecToFloat = function bigDecToFloat(bigD) {
  return Number.parseFloat(bigD);
};

exports.underlyingOfCToken = function underlyingOfCToken(ctoken, weth = false) {
  if (ctoken === "cETH") return weth ? "WETH" : "ETH";
  return ctoken.slice(1);
};

exports.parseUnitsHelper = function parseUnitsHelper(amount, symbol) {
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
      let a = Number.parseFloat(amount) * 1e8;
      let b = Number.parseInt(a);
      return BigNumber.from(b);
    case "USDT":
    case "USDC":
      let c = Number.parseFloat(amount) * 1e6;
      let d = Number.parseInt(c);
      return BigNumber.from(d);
    default:
      throw new Error("symbol not found");
  }
};

// TODO refactor with reverse obj, split up addrs into caddrs, erc20 addrs, etc
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
    case ADDRS.cREP:
      return "cREP";
    case ADDRS.cSAI:
      return "cSAI";
    case ADDRS.cLINK:
      return "cLINK";
    case ADDRS.cTUSD:
      return "cTUSD";
    default:
      throw new Error("unknown ctoken address");
  }
};

exports.offchainAggAddrToTicker = function (addr) {
  // copy
  addr = addr.toLowerCase();
  let offchainagg = ADDRS.OFFCHAIN_AGG;
  Object.keys(offchainagg).map((key) => {
    // set values to lowercased strings
    offchainagg[key] = offchainagg[key].toLowerCase();
  });
  // get map from lowercased addrs -> tickers
  return _.invert(offchainagg)[addr];
};
