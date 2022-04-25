const { ENDPOINTS, FORKS, FORK_5, TEST_PARAMS } = require("./TestConstants");
const { ABIS, PARAMS } = require("../lib/Constants");
const FindShortfallPositions = require("../lib/FindShortfallPositions");
const { ethers } = require("hardhat");
const { BigNumber } = require("ethers");
const AccountsDbClient = require("../lib/AccountsDbClient");
/**
 * Profile the Node.js Finder library with just sick accounts and no threads. 
 * It takes about 18 seconds to fetch 1100 sick accounts and 50 seconds to process
 * it. For about 70 accounts it takes one second to fetch and 3 seconds to process.
 * 
 * One optimization is to keep sick accounts in node's memory (assuming 
 * memory is not shared but copied over to node's page table). TODO
 * 
 * Please sync a database first before running. 
 * 
 * Use `node --prof test/profile.js`. Could use `ab -k -c 20 -n 250` for
 * a web server or use tick file processor 
 * `node --prof-process isolate-0x63e9e60-15214-v8.log > processed.txt`.
 */
async function main() {
  const provider = new ethers.providers.JsonRpcProvider(ENDPOINTS.RPC_PROVIDER);
  const db = {
    host: ENDPOINTS.REDIS_HOST,
    port: ENDPOINTS.REDIS_PORT,
  };
  const store = new AccountsDbClient(db);
  await store.init();
  
  console.log(new Date());
  const accounts = await store.getStoredCompoundAccounts();
  console.log(new Date());
  console.log(`# of sick accounts: ${accounts.length}`);
  const params = await store.getStoredCompoundParams();
  const lowTestingGasPrice = BigNumber.from("3000000000");
  const finder = new FindShortfallPositions(
    accounts,
    params,
    lowTestingGasPrice,
    provider
  );
  finder.chainId = 1337;
  finder.minProfit = PARAMS.MIN_LIQ_PROFIT;
  console.log(new Date());
  const arr = await finder.getLiquidationTxsInfo();
  console.log(new Date());
  console.log('done');
}

main().then(() => {}).catch((e) => {
  console.error(e);
});

