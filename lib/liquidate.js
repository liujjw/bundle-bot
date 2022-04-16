const { ADDRS, ABIS } = require('./Constants');
const { BigNumber, ethers } = require('ethers');

let provider = new ethers.getDefaultProvider();
let signerWithProvider = new ethers.Wallet(process.env.MMM_PK, provider);
let lendingPool = new ethers.Contract(ADDRS.AAVE_V2_LENDING_POOL, ABIS.AAVE_V2_LENDING_POOL, provider);