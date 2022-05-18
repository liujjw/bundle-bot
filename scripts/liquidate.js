const { ADDRS, ABIS } = require("../lib/Constants");
const ethers = require("ethers");

const provider = new ethers.getDefaultProvider("http://localhost:8545");
const signer = provider.getSigner();
const lendingPool = new ethers.Contract(
  ADDRS.AAVE_V2_LENDING_POOL,
  ABIS.AAVE_V2_LENDING_POOL,
  signer
);

// eslint-disable-next-line require-jsdoc
async function main() {
  await lendingPool.flashLoan(

  );
}

main.then();
