const FindShortfallPositions = require("../lib/FindShortfallPositions");
const AccountsDbClient = require("../lib/AccountsDbClient");
const AuctionBidPricer = require("../lib/AuctionBidPricer");
const { ENDPOINTS, FORK_2, FORK_5, TEST_PARAMS, FORK, MATH_ERROR_FORK } = require("./TestConstants");
const { ABIS, PARAMS, ADDRS } = require("../lib/Constants");
const { sleep } = require("../lib/Utils");
const Utils = require("../lib/Utils");

const shell = require("shelljs");
const { BigNumber } = require("ethers");
const { ethers } = require("hardhat");
const hre = require("hardhat");
const fetch = require("node-fetch");

const Runner = require("../lib/Runner");

require("dotenv").config({ path: __dirname + "/../.env" });
jest.setTimeout(300 * 1000);

let compoundParams;
let sickCompoundAccounts;
let hardhatNode;
let provider;
let store;
let lendingPool;
let cUSDC;
let flashmint;
let bidPricer;

beforeAll(async () => {
  if (process.env.REDIS_STARTED === "false") {
    expect(
      shell.exec(
        `docker run --name myredis -d \\
        -p ${ENDPOINTS.REDIS_PORT}:${ENDPOINTS.REDIS_PORT} \\
        -v /d/redis_0:/data redis redis-server \\
        --save 60 1 --loglevel warning`
      )
    ).toBe(0);
    console.log("redis started");
  }

  hardhatNode = shell.exec(
    `FORK_BLOCKNUMBER=${FORK.blockNum} npx -c 'hardhat node'`,
    { async: true, silent: true },
    (code, stdout, stderr) => {
      if (code !== 0) {
        console.error("error during startup:", stderr);
      } else {
        console.log(stdout);
      }
    }
  );
  hardhatNode.on("error", err => {
    console.error(err);
  })
  hardhatNode.on("message", message => {
    console.log(message);
  })
  await sleep(TEST_PARAMS.NODE_STARTUP_TIME_MS);
  console.log("node started");

  provider = new ethers.providers.JsonRpcProvider(
    ENDPOINTS.RPC_PROVIDER
  );
  const db = {
    host: ENDPOINTS.REDIS_HOST,
    port: ENDPOINTS.REDIS_PORT,
    database: TEST_PARAMS.DB_NUMBER_DATA
  };
  store = new AccountsDbClient(db, provider);
  await store.init();
  if (process.env.DB_READY === "false") {
    console.log("please wait a while for DB to init");
    await store.setCompoundAccounts(FORK.blockNum);
    await store.setCompoundParams();
    console.log("db has been set");
  }
  sickCompoundAccounts = await store.getStoredCompoundAccounts();
  compoundParams = await store.getStoredCompoundParams();
  bidPricer = new AuctionBidPricer(
    Utils.bigNumToFloat(compoundParams.prices["ETH"], 6)
  );

  expect(shell.exec(`npx hardhat compile && npx hardhat deploy`).code).toBe(0);
  console.log("bot contract deployed");

  lendingPool = new ethers.Contract(
    ADDRS["AAVE_V2_LENDING_POOL"],
    ABIS["AAVE_V2_LENDING_POOL"],
    provider.getSigner(TEST_PARAMS.DEFAULT_SENDER_ADDRESS)
  );
  cUSDC = new ethers.Contract(
    ADDRS["cUSDC"],
    ABIS["C_TOKEN"],
    provider.getSigner(TEST_PARAMS.DEFAULT_SENDER_ADDRESS)
  );
  flashmint = new ethers.Contract(
    "0x1EB4CF3A948E7D72A198fe073cCb8C7a948cD853",
    [`function flashLoan(
      address receiver,
      address token,
      uint256 amount,
      bytes calldata data
      ) external returns (bool)`],
      provider.getSigner(TEST_PARAMS.DEFAULT_SENDER_ADDRESS)
  );
});

afterAll(() => {
  hardhatNode.kill("SIGKILL");
});

describe("Contract", function () {
  test('backrun transmit post price for liq #2', async function() {
      await hre.network.provider.request({
        method: "hardhat_impersonateAccount",
        params: ["0x7BFb89db2d7217c57C3Ad3d4B55826eFD17dC2e9"],
      });

      const data = "0xc98075390000000000000000000000000000000000000000000000000000000000000080000000000000000000000000000000000000000000000000000000000000050000000000000000000000000000000000000000000000000000000000000006800001000000010001000100000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000046000000000000000000000009f88d5f42679b75c4a0244716f695ef30000502d060c0e03070a091a021308150b060f1e19050012110d161b14040118101d171c000000000000000000000000000000000000000000000000000000000000000060000000000000000000000000000000000000000000000000000000000000001f00000000000000000000000000000000000000000000000000000039e9ac2da300000000000000000000000000000000000000000000000000000039e9ac2da300000000000000000000000000000000000000000000000000000039ea0f310000000000000000000000000000000000000000000000000000000039f925be230000000000000000000000000000000000000000000000000000003a05a2a4310000000000000000000000000000000000000000000000000000003a1638ef200000000000000000000000000000000000000000000000000000003a16d9ad880000000000000000000000000000000000000000000000000000003a16d9ad880000000000000000000000000000000000000000000000000000003a1859ade10000000000000000000000000000000000000000000000000000003a1859ade10000000000000000000000000000000000000000000000000000003a1859ade10000000000000000000000000000000000000000000000000000003a215016c00000000000000000000000000000000000000000000000000000003a275d16d20000000000000000000000000000000000000000000000000000003a275d16d20000000000000000000000000000000000000000000000000000003a275d16d20000000000000000000000000000000000000000000000000000003a2781426b0000000000000000000000000000000000000000000000000000003a319ba87b0000000000000000000000000000000000000000000000000000003a34f64ba00000000000000000000000000000000000000000000000000000003a37e878910000000000000000000000000000000000000000000000000000003a46bd70ed0000000000000000000000000000000000000000000000000000003a46bd70ed0000000000000000000000000000000000000000000000000000003a4893c2320000000000000000000000000000000000000000000000000000003a4e57601b0000000000000000000000000000000000000000000000000000003a4ee910000000000000000000000000000000000000000000000000000000003a4ee910000000000000000000000000000000000000000000000000000000003a5192e9600000000000000000000000000000000000000000000000000000003a54465a800000000000000000000000000000000000000000000000000000003a54465a800000000000000000000000000000000000000000000000000000003a54465a800000000000000000000000000000000000000000000000000000003a54465a800000000000000000000000000000000000000000000000000000003a5ba9fdd5000000000000000000000000000000000000000000000000000000000000000b81e6c49342c28d8644b49966fdf736eb77a071501af3c98c50d151192a8687a4a14401705c64b928316e55a6308cbbe406c0ee5b5d45aff4c900ee23be052392e9cf03af242538d69a2df148a8629a1c651dbf76d53cc74e2701c43dd840856c516b40fa286eab852ea62a0ce8ef4ee5be57317da332463b970db375b55d2d8a4a52a24571b2bdf2a2af25ad2d6ebcea4b042f4ce8722516312b424de047b58082dc023e700c91be28f5570f9e245cc177767a118a7dd3c48ede59caff7ef969a1ddd01ac04eb54b2666d5f2f91ddf28f3f5b6b785e47b8a0a8c3c6f69de25d8aa7f663f539b68d0e7b136211c795e94eabb55e745744bae5f917c6f9dedbab2792a600db14d5ea3feae89837a7acd6eb9627edce21183d472c9c985fa4f57b44ddeb3f6a6f94458f540f4c3f35410170572323a363b63dba54c19244663f2a9de168aea29206c5d431fcd043084fb28b1f2fd90f6eff1cd8f11ee309ae78fdf000000000000000000000000000000000000000000000000000000000000000b646d4caf1317595919a4cb84f7f9ebc07c39ed3424940083b0f22444dd7f110f766dbbff7c6c98541d45441c60e85ccbda88c5520301798cb0b7fc8c6094887c68d5b454a16a23b701f6993415550e7cab2e0c8b67f4c951732ae91ba6abda240708ec7c2ca6059caeaa07a9acf57bd78828ab754f51c436d41c3121023e53fd1862fc8d33c457fe7fdf38d6edf3e03768a74c396cf37871c1d16ef9a985175a06a6561d5f501dc0aeb01f406d2cdf0e226bfba44ff629b712966ac13ea0a15c30ccd51e395caba9dc236a76aacd02e2d1060d2a370bced96c9d7d7d8a857336065578b69d076dfa869312a63ae4391421f67466dc52da67c2dda381114f95095661d8c71acbcc04b2e65c480a8017bbedaf1a6202d569e6ff20ea9868e897e2272818e60fa21aa29014bfa566b5cbde6eaffff49d9294a7b7f9381053067663300361cee28cd4bf27d816967c613a72cc4e3cf28a1ce58932071491df9de2ef";
      const signer = await ethers.getSigner("0x7BFb89db2d7217c57C3Ad3d4B55826eFD17dC2e9");
      const tx = {
        data: data,
        to: ADDRS.OFFCHAIN_AGG["ETH"]
      }

      const gas = await signer.estimateGas(tx);
      console.log("gas used by post price", gas);

      const response = await signer.sendTransaction({
        data: data,
        to: ADDRS.OFFCHAIN_AGG["ETH"]
      });
      const receipt = await response.wait();
      expect(receipt.status).toBe(1);
  })

  test(`validate liq #2 by sending acutal liquidators tx`, async function() {
      // other searcher
      await hre.network.provider.request({
        method: "hardhat_impersonateAccount",
        params: ["0xf8ddfa616f4575049a7dd8f4b5f3b335dc789157"],
      });
      const data = "0x5f53c507c8b88c5a000000000000000000000000000000000000000004020200000000050000000000000000000000003b5ef98925ba985e0b3bd9c53d868931530c89e3000000000000000000000000000000000000000000000000000000277c648874000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000a00000000000000000000000000000000000000000000000000000000000000001000000005738d5ae68c5005f7bfb89db2d7217c57c3ad3d4b55826efd17dc2e9";
      const signer = await ethers.getSigner("0xf8ddfa616f4575049a7dd8f4b5f3b335dc789157");
      const response = await signer.sendTransaction({
        to: "0x33334570f7e1df34a09377c7f327feb65e2b3faf",
        data: data
      })
      const receipt = await response.wait();
      expect(receipt.status).toBe(1);
  });

  test(`validate liq #2 liquidateBorrow`, async function() {
    const tx = await cUSDC.populateTransaction.liquidateBorrow(
      FORK_2.arb.borrower, 
      FORK_2.arb.repayAmount, 
      FORK_2.arb.cTokenCollateral
    );
    // const signedTx = provider.getSigner(DEFAULT_SENDER_ADDRESS).signTransaction(tx);
    const gas = await provider.getSigner(TEST_PARAMS.DEFAULT_SENDER_ADDRESS).estimateGas(tx);
    console.log("gas used to liquidateBorrow", gas);

    const response = await cUSDC.liquidateBorrow(
      FORK_2.arb.borrower, 
      FORK_2.arb.repayAmount, 
      FORK_2.arb.cTokenCollateral
    );
    const receipt = await response.wait();
    expect(receipt.status).toBe(1);
  });

  test("forge test", async function() {
    shell.exec(
      `forge test -vvv --fork-url http://localhost:8545`
      );
      // --etherscan-api-key WTWMA5MXRQMZZUYPF3JQQGIAXE84VH3KBI
      // --debug "testLiquidate2"
      // console.log
  });
});

describe("Infra", function() {
  test(`finds a known liquidation (#2) at 
  ${FORK_2.blockNumPrev} by borrower ${FORK_2.borrower}`, async function () {
    const predicate = (val) =>
      val.id.toLowerCase() === FORK_2.borrower.toLowerCase();
    expect(sickCompoundAccounts.find(predicate)).not.toBe(undefined);

    const filteredAccounts = sickCompoundAccounts.filter(predicate);
    const lowTestingGasPrice = BigNumber.from(FORK_2.baseFee);
    const finder = new FindShortfallPositions(
      filteredAccounts,
      compoundParams,
      lowTestingGasPrice,
      provider
    );
    finder.minProfit = PARAMS.MIN_LIQ_PROFIT;

    const arr = await finder.getLiquidationTxsInfo();
    const arb = arr.find(
      (arb) =>
        arb.borrower.toLowerCase() === FORK_2.borrower.toLowerCase()
    );
    expect(arb).not.toBe(undefined);
    expect(arb.netProfitGivenBaseFee).toBeGreaterThan(1000);
    // console.log(arb);
  });

  test(`fetches the current most recent data about compound accounts and 
  params with the store`, async function () {
    console.log(`sick accounts n=${sickCompoundAccounts.length}: \n`, 
      sickCompoundAccounts);
    console.log("params: \n", compoundParams);
  });

  test("mempool listener works", async function () {
    // run stalker.js
    // assert standard json tx object format
  });

  // need to test server and workers together bc workers assume the servers
  // env vars
  test(`arb processor (runner server) processes arb oppurtunities and 
  bundle gets into mev mempool`, async function () {
    shell.env["RUNNER_ENDPOINT"] = ENDPOINTS.RUNNER_ENDPOINT;
    shell.env["RUNNER_PORT"] = ENDPOINTS.RUNNER_PORT;
    shell.env["BOT_ADDR"] = ENDPOINTS.DEFAULT_BOT_ADDRESS;
    shell.env["PROVIDER_ENDPOINT"] = ENDPOINTS.RPC_PROVIDER;
    shell.env["NODE_ENV"] = TEST_PARAMS.TEST_RUNNER_FLAG;
    shell.env["REDIS_HOST"] = ENDPOINTS.REDIS_HOST;
    shell.env["REDIS_PORT"] = ENDPOINTS.REDIS_PORT;
    new Runner();
    fetch(`${ENDPOINTS.RUNNER_ENDPOINT}/priceUpdate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(FORK_5.ETH_OFFCHAIN_AGG_TRANSMIT_CALL),
    });
    // have not found sample tx yet/does not happen often enough anyway
    // fetch(`${ENDPOINTS.RUNNER_ENDPOINT}/paramUpdate`, {
    //     method: "POST",
    //     headers : { "Content-Type": "application/json" },
    //     body: JSON.stringify(FORK_5.SET_COLLATERAL_FACTOR)
    // })

    // sleep test so server can catch up
    await sleep(10000);
  });
});

describe.only("Integrations", function() {
  // NOTE set DB and fork num appropriately
  // TODO auto set fork num (set provider)
  // TODO allow fetching just one user at one blocknumber
  test.only(`math error in finder exchange rates section`, async function() {
    const finder = new FindShortfallPositions(
      sickCompoundAccounts.filter(acc =>
        acc.id === MATH_ERROR_FORK.user),
      compoundParams,
      BigNumber.from(TEST_PARAMS.STANDARD_BASEFEE),
      provider
    );

    // remember to add a breakpoint
    await finder.getLiquidationTxsInfo();
  });

  test(`(1) finds compound arbs given a low gas price (no backruns) at any 
  blockheight (2) liquidates a majority of arbs (3) eth balance of sender grows`, 
  async function () {
    const initialEth = await provider.getBalance(
      TEST_PARAMS.DEFAULT_SENDER_ADDRESS
    );
    // 3 gewi
    const finder = new FindShortfallPositions(
      sickCompoundAccounts,
      compoundParams,
      BigNumber.from(TEST_PARAMS.LOW_BASEFEE),
      provider
    );
    finder.on("error", err => {
      // console.error(err);
    })
    const scale = 1e8;
    const newPrice = BigNumber.from(2000 * scale);
    finder.setParam("price", { ticker: "ETH", value: newPrice });
    bidPricer.ethPrice = 2000;
    finder.minProfit = 200;
    const arr = await finder.getLiquidationTxsInfo();
    let countSuccesses = 0;
    const total = arr.length;

    expect(total).toBeGreaterThan(10);

    const totalEthUsedForGas = BigNumber.from(0);
    for (const elem of arr) {
      try {
        const mevInfo = bidPricer.getTip();
        const params = ABIS.botEncode(
          elem.cTokenBorrowed,
          elem.cTokenCollateral,
          elem.tokenCollateral,
          elem.borrower,
          elem.maxSeizeTokens,
          mevInfo.weiTip,
          mevInfo.weiTip.add(PARAMS.MIN_LIQ_PROFIT_IN_ETH)
        );

        const response = await lendingPool.flashLoan(
          ENDPOINTS.DEFAULT_BOT_ADDRESS,
          [elem.tokenBorrowed],
          [elem.repayAmount],
          [BigNumber.from(0)],
          ENDPOINTS.DEFAULT_BOT_ADDRESS,
          params, 
          0,
          {
            gasLimit: BigNumber.from(PARAMS.COMP_LIQ_GAS_BOUND)
          }
        );
        const receipt = await response.wait();
        if (receipt.status === 1) {
          countSuccesses += 1;
        }

        totalEthUsedForGas.add(
          receipt.effectiveGasPrice.mul(receipt.cumulativeGasUsed)
        );
      } catch (e) {
        // console.error(e);
      }
    }
    expect((countSuccesses / total) * 100).toBeGreaterThan(80);

    const finalEth = await provider.getBalance(
      TEST_PARAMS.DEFAULT_SENDER_ADDRESS
    );
    // console.log(
    //   "final eth balance:",
    //   finalEth.gt(initialEth.sub(totalEthUsedForGas)).toString()
    // );
    expect(finalEth.gt(initialEth.sub(totalEthUsedForGas))).toBe(true);
  });

  test(`finds and liquidates past liquidations at given blockheights`, 
  async function() {

  });
});
