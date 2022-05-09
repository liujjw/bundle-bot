const Queue = require("bull");
const { ENDPOINTS, FORK_2, FORK_5, TEST_PARAMS } = require("./TestConstants");
const { ABIS, PARAMS } = require("../lib/Constants");
const FindShortfallPositions = require("../lib/FindShortfallPositions");
const ethers  = require("ethers");
const { BigNumber } = require("ethers");
const AccountsDbClient = require("../lib/AccountsDbClient");

const taskQ = new Queue("task q", "http://127.0.0.1:6379", {
  redis: {
    db: 1
  }
});

taskQ.process(async function (job, done) {

  const provider = new ethers.providers.JsonRpcProvider(ENDPOINTS.RPC_PROVIDER);
  const db = {
    host: ENDPOINTS.REDIS_HOST,
    port: ENDPOINTS.REDIS_PORT,
    database: 14
  };
  const store = new AccountsDbClient(db);
  await store.init();
  
  console.log('fetch accs', new Date(), process.pid);
  const accounts = await store.getStoredCompoundAccounts(job.data.chunkIndex,
    job.data.splitFactor);
  console.log('done fetch acc', new Date(), process.pid);
  
  console.log(`# of sick accounts: ${accounts.length}`, process.pid);
  const params = await store.getStoredCompoundParams();
  const lowTestingGasPrice = BigNumber.from("3000000000");
  const finder = new FindShortfallPositions(
    accounts,
    params,
    lowTestingGasPrice,
    provider
  );
  finder.minProfit = PARAMS.MIN_LIQ_PROFIT;
  //
  const scale = 1e8;
  const newPrice = BigNumber.from(2000 * scale);
  finder.setParam("price", { ticker: "ETH", value: newPrice });
  // bidPricer.ethPrice = Utils.bigNumToFloat(newPrice, 8);
  //
  console.log('process', new Date(), process.pid);
  const arr = await finder.getLiquidationTxsInfo();
  console.log('process done', new Date(), process.pid);
  console.log('found', arr.length);
  // job.data contains the custom data passed when the job was created
  // job.id contains id of this job.
  // job.progress(42);
  done();
  // done(new Error("error transcoding"));
  // done(null, { framerate: 29.5 /* etc... */ });
  // throw new Error("some unexpected error");
});