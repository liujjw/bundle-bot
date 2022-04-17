const FindShortfallPositions = require("../lib/FindShortfallPositions");
const AccountsDbClient = require('../lib/AccountsDbClient');
const TestConstants = require('./TestConstants');
const { ABIS, PARAMS } = require('../lib/Constants');

const fs = require('fs');
const shell = require('shelljs');
const { BigNumber } = require('ethers');
const { ethers } = require('hardhat');
const fetch = require('node-fetch');

const Runner = require("../lib/Runner");

require('dotenv').config({ path: __dirname + "/../.env"});
jest.setTimeout(300 * 1000);

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

describe("Data", function() {
    let compoundAccounts;
    let compoundParams;
    let sickCompoundAccounts;
    let hardhatNode;

    beforeAll(async () => {
        if (process.env.TEST_CONSTANTS_REVIEWED === "false") {
            process.exit(1);
        }
    
        if (process.env.REDIS_STARTED === "false") {
            expect(shell.exec(`docker run --name myredis -d -p ${TestConstants.ENDPOINTS.REDIS_PORT}:${TestConstants.ENDPOINTS.REDIS_PORT} -v /d/redis_0:/data redis redis-server --save 60 1 --loglevel warning`)).toBe(0);
            console.log('redis started');
        }
    
        if (process.env.LOCAL_NODE_STARTED === "false") {
            hardhatNode = shell.exec(`FORK_BLOCKNUMBER=${TestConstants.FORK.blockNumber} npx -c 'hardhat node'`, {async:true, silent:true}, (code, stdout, stderr) => {
                // TODO log
            });
            await sleep(TestConstants.PARAMS.NODE_STARTUP_TIME_MS);
            console.log("node started");
        }
    
        let provider = new ethers.providers.JsonRpcProvider(TestConstants.ENDPOINTS.RPC_PROVIDER);
        let db = {
            host: TestConstants.ENDPOINTS.REDIS_HOST,
            port: TestConstants.ENDPOINTS.REDIS_PORT
        };
        let store = new AccountsDbClient(db, provider);
        await store.init();
        if (process.env.DB_READY === "false") {
            await store.setCompoundAccounts(TestConstants.FORK.blockNumber);
            await store.setCompoundParams();
            console.log('db has been set');
        } 
        compoundAccounts = await store.getStoredCompoundAccounts();
        sickCompoundAccounts = await store.getSickStoredCompoundAccounts();
        compoundParams = await store.getStoredCompoundParams();
    
        if (process.env.BOT_DEPLOYED === "false") {
            expect(shell.exec(`npx hardhat compile && npx hardhat deploy`).code).toBe(0);
            console.log("bot contract deployed");
        }
    });
    
    afterAll(() => {
        hardhatNode.kill('SIGKILL');
    });

    test("fetches the current most recent data about compound accounts and params with the store", async function() {
        console.log("sick accounts: \n", sickCompoundAccounts);
        console.log("params: \n", compoundParams);
    });

    // TODO backtest on mediumDatasetOfLiquidations
    test("liquidates small and medium dataset of actual liquidations through the bot contract", async function() {

    });

    test("finder finds compound arbs given a low gas price and contract liquidates a majority of arbs at one blockheight; eth balance of sender grows", async function() {
        let provider = new ethers.providers.JsonRpcProvider(TestConstants.ENDPOINTS.RPC_PROVIDER)
        let accounts = sickCompoundAccounts;
        let params = compoundParams;

        // 3 gewi
        let lowTestingGasPrice = BigNumber.from("3000000000");
        let finder = new FindShortfallPositions( 
            accounts, 
            params,
            lowTestingGasPrice,
            provider
        );
        finder.chainId = 1337;
        finder.minProfit = 15;

        let bot = new ethers.Contract(TestConstants.ENDPOINTS.DEFAULT_BOT_ADDRESS, ABIS['BOT'], provider.getSigner(TestConstants.ENDPOINTS.DEFAULT_SENDER_ADDRESS));
        let initialEth = await provider.getBalance(TestConstants.ENDPOINTS.DEFAULT_SENDER_ADDRESS);

        let arr = await finder.getLiquidationTxsInfo();
        let countSuccesses = 0;
        let total = arr.length;
        
        expect(total).toBeGreaterThan(10);

        let totalEthUsedForGas = BigNumber.from(0);
        for (let elem of arr) {
            console.log("arb:\n", elem);
            try {
                let response = await bot.liquidate(
                    elem.cTokenBorrowed,
                    elem.tokenBorrowed,
                    elem.cTokenCollateral,
                    elem.tokenCollateral,
                    elem.borrower,
                    elem.repayAmount,
                    elem.maxSeizeTokens,
                    {
                        gasLimit: BigNumber.from(PARAMS.LIQUIDATION_GAS_UPPER_BOUND),
                        gasPrice: elem.gasPrice
                    }
                );

                let receipt = await response.wait();
                totalEthUsedForGas.add(receipt.effectiveGasPrice.mul(receipt.cumulativeGasUsed));
                console.log("receipt:\n", receipt);
                if(receipt.status === 1) {
                    countSuccesses += 1;
                }
            } catch (e) {
                console.log(e);
            }
        }
        let finalEth = await provider.getBalance(TestConstants.ENDPOINTS.DEFAULT_SENDER_ADDRESS);
        expect((countSuccesses / total) * 100).toBeGreaterThan(80);
        console.log('final eth balance:', finalEth.gt(initialEth.sub(totalEthUsedForGas)).toString());
        expect(finalEth.gt(initialEth.sub(totalEthUsedForGas))).toBe(true);
    });

    // need to test server and workers together bc workers assume the servers env vars
    test("arb processor (runner server) processes arb oppurtunities and bundle gets into mev mempool", async function(){
        shell.env['RUNNER_ENDPOINT'] = TestConstants.ENDPOINTS.RUNNER_ENDPOINT;
        shell.env['RUNNER_PORT'] = TestConstants.ENDPOINTS.RUNNER_PORT;
        shell.env['BOT_ADDR'] = TestConstants.ENDPOINTS.DEFAULT_BOT_ADDRESS;
        shell.env['PROVIDER_ENDPOINT'] = TestConstants.ENDPOINTS.RPC_PROVIDER;
        shell.env['NODE_ENV'] = TestConstants.PARAMS.TEST_RUNNER_FLAG;
        shell.env['REDIS_HOST'] = TestConstants.ENDPOINTS.REDIS_HOST;
        shell.env['REDIS_PORT'] = TestConstants.ENDPOINTS.REDIS_PORT;
        new Runner();
        fetch(`${TestConstants.ENDPOINTS.RUNNER_ENDPOINT}/priceUpdate`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(TestConstants.FORK.ETH_OFFCHAIN_AGG_TRANSMIT_CALL),
        });
        // have not found sample tx yet/does not happen often enough anyway
        // fetch(`${TestConstants.ENDPOINTS.RUNNER_ENDPOINT}/paramUpdate`, {
        //     method: "POST",
        //     headers : { "Content-Type": "application/json" },
        //     body: JSON.stringify(TestConstants.FORK.SET_COLLATERAL_FACTOR)
        // })

        // sleep test so server can catch up
        await sleep(10000);
    });
});

describe("Infra", function() {
    test("mempool listener works", async function() {
        // run stalker.js
        // assert standard json tx object format
    });
});

describe.only("Contracts", function() {
    beforeAll(async function() {
        if (process.env.LOCAL_NODE_STARTED === "false") {
            hardhatNode = shell.exec(`FORK_BLOCKNUMBER=${TestConstants.FORK.blockNumber} npx -c 'hardhat node'`, {async:true, silent:true}, (code, stdout, stderr) => {
                // TODO log
            });
            await sleep(TestConstants.PARAMS.NODE_STARTUP_TIME_MS);
            console.log("node started");
        }
    })
    

    test("compound liquidation contract works", async function() {
        shell.exec('forge test -vvvv --fork-url http://localhost:8545');
    });
});
