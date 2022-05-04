const FindShortfallPositions = require("../lib/FindShortfallPositions");
const AccountsDbClient = require("../lib/AccountsDbClient");
const { ENDPOINTS, FORKS, FORK_5, TEST_PARAMS } = require("./TestConstants");
const { ABIS, PARAMS, ADDRS } = require("../lib/Constants");

const shell = require("shelljs");
const { BigNumber } = require("ethers");
const { ethers } = require("hardhat");
const fetch = require("node-fetch");

const Runner = require("../lib/Runner");

require("dotenv").config({ path: __dirname + "/../.env" });
jest.setTimeout(300 * 1000);

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

describe.only("Data", function () {
  let compoundParams;
  let sickCompoundAccounts;
  let hardhatNode;

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
      `FORK_BLOCKNUMBER=${FORKS.blockNum2Prev} npx -c 'hardhat node'`,
      { async: true, silent: true },
      (code, stdout, stderr) => {
        console.log(code, stdout, stderr);
      }
    );
    await sleep(TEST_PARAMS.NODE_STARTUP_TIME_MS);
    console.log("node started");

    const provider = new ethers.providers.JsonRpcProvider(
      ENDPOINTS.RPC_PROVIDER
    );
    const db = {
      host: ENDPOINTS.REDIS_HOST,
      port: ENDPOINTS.REDIS_PORT,
      database: 0
    };
    const store = new AccountsDbClient(db, provider);
    await store.init();
    if (process.env.DB_READY === "false") {
      await store.setCompoundAccounts(FORKS.blockNum2Prev);
      await store.setCompoundParams();
      console.log("db has been set");
    }
    sickCompoundAccounts = await store.getStoredCompoundAccounts();
    compoundParams = await store.getStoredCompoundParams();

    expect(shell.exec(`npx hardhat compile && npx hardhat deploy`).code).toBe(
      0
    );
    console.log("bot contract deployed");
  });

  afterAll(() => {
    hardhatNode.kill("SIGKILL");
  });

  test(`fetches the current most recent data about compound accounts and 
  params with the store`, async function () {
    console.log(`sick accounts n=${sickCompoundAccounts.length}: \n`, 
      sickCompoundAccounts);
    console.log("params: \n", compoundParams);
  });

  // TODO failing
  test(`finder finds compound arbs given a low gas price (no backruns) and 
  contract liquidates a majority of arbs at one blockheight and 
  eth balance of sender grows`, async function () {
    const provider = new ethers.providers.JsonRpcProvider(
      ENDPOINTS.RPC_PROVIDER
    );
    const accounts = sickCompoundAccounts;
    const params = compoundParams;

    // 3 gewi
    const lowTestingGasPrice = BigNumber.from("3000000000");
    const finder = new FindShortfallPositions(
      accounts,
      params,
      lowTestingGasPrice,
      provider
    );
    finder.on("error", err => {
      console.error(err);
    })
    // const scale = 1e8;
    // const newPrice = BigNumber.from(1500 * scale);
    // finder.setParam("price", { ticker: "ETH", value: newPrice });
    finder.minProfit = 15;
    const lendingPool = new ethers.Contract(
      ADDRS["AAVE_V2_LENDING_POOL"],
      ABIS["AAVE_V2_LENDING_POOL"],
      provider.getSigner(ENDPOINTS.DEFAULT_SENDER_ADDRESS)
    )
    const initialEth = await provider.getBalance(
      ENDPOINTS.DEFAULT_SENDER_ADDRESS
    );

    const arr = await finder.getLiquidationTxsInfo();
    let countSuccesses = 0;
    const total = arr.length;

    expect(total).toBeGreaterThan(10);

    const totalEthUsedForGas = BigNumber.from(0);
    for (const elem of arr) {
      console.log("arb:\n", elem);
      try {
        const coder = new ethers.utils.AbiCoder();
        const params = coder.encode([
          'address', 'address', 'address', 'address', 'uint256'
        ], [
          elem.cTokenBorrowed, elem.cTokenCollateral, elem.tokenCollateral,
          elem.borrower, elem.maxSeizeTokens
        ]);

        const response = await lendingPool.flashLoan(
          ENDPOINTS.DEFAULT_BOT_ADDRESS,
          [elem.tokenBorrowed],
          [elem.repayAmount],
          [0],
          ENDPOINTS.DEFAULT_BOT_ADDRESS,
          params, 
          0,
          {
            gasLimit: BigNumber.from(PARAMS.LIQUIDATION_GAS_UPPER_BOUND)
          }
        );
        const receipt = await response.wait();
        totalEthUsedForGas.add(
          receipt.effectiveGasPrice.mul(receipt.cumulativeGasUsed)
        );
        console.log("receipt:\n", receipt);
        if (receipt.status === 1) {
          countSuccesses += 1;
        }
      } catch (e) {
        console.error(e);
      }
    }
    const finalEth = await provider.getBalance(
      ENDPOINTS.DEFAULT_SENDER_ADDRESS
    );
    expect((countSuccesses / total) * 100).toBeGreaterThan(80);
    console.log(
      "final eth balance:",
      finalEth.gt(initialEth.sub(totalEthUsedForGas)).toString()
    );
    expect(finalEth.gt(initialEth.sub(totalEthUsedForGas))).toBe(true);
  });

  // TODO backtest on mediumDatasetOfLiquidations
  test(`finds a known liquidation (#2) at 
  ${FORKS.blockNum2Prev} by borrower ${FORKS.blockNum2Borrower}`, async function () {
    const provider = new ethers.providers.JsonRpcProvider(
      ENDPOINTS.RPC_PROVIDER
    );
    let accounts = sickCompoundAccounts;
    const params = compoundParams;
    const predicate = (val) =>
      val.id.toLowerCase() === FORKS.blockNum2Borrower.toLowerCase();
    expect(accounts.find(predicate)).not.toBe(undefined);

    accounts = accounts.filter(predicate);
    const lowTestingGasPrice = BigNumber.from(FORKS.blockNum2BaseFee);
    const finder = new FindShortfallPositions(
      accounts,
      params,
      lowTestingGasPrice,
      provider
    );
    finder.minProfit = PARAMS.MIN_LIQ_PROFIT;

    const arr = await finder.getLiquidationTxsInfo();
    const arb = arr.find(
      (arb) =>
        arb.borrower.toLowerCase() === FORKS.blockNum2Borrower.toLowerCase()
    );
    expect(arb).not.toBe(undefined);
    expect(arb.netProfitFromLiquidationGivenGasPrice).toBeGreaterThan(1000);
    console.log(arb);
  });

  test.only("liquidates known liquidation (noArb)", async function () {
    shell.exec(
      `forge test -vvvvv --fork-url http://localhost:8545`
      );
  });

  test("debug aave flashloan safetransfer failing fork_5", async function () {
    shell.exec(
      'forge test --debug "testLiquidate2" --fork-url http://localhost:8545 --etherscan-api-key WTWMA5MXRQMZZUYPF3JQQGIAXE84VH3KBI'
    );
  });
});

describe("Infra", function () {
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
