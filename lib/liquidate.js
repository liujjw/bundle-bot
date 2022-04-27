const { ADDRS, ABIS } = require("./Constants");
const { BigNumber, ethers } = require("ethers");

const provider = new ethers.getDefaultProvider();
const signerWithProvider = new ethers.Wallet(process.env.MMM_PK, provider);
const lendingPool = new ethers.Contract(
  ADDRS.AAVE_V2_LENDING_POOL,
  ABIS.AAVE_V2_LENDING_POOL,
  provider
);
