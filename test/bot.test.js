const FindShortfallPositions = require("../lib/FindShortfallPositions");
const AccountsDbClient = require('../lib/AccountsDbClient');
const TestConstants = require('./TestConstants');
const { ABIS, ADDRS, ENDPOINTS } = require('../lib/Constants');

const shell = require('shelljs');
const { BigNumber } = require('ethers');
const { ethers } = require('hardhat');
const Common = require("@ethereumjs/common");
const { FeeMarketEIP1599Transaction, Transaction } = require('@ethereumjs/tx');

require('dotenv').config({ path: __dirname + "/../.env"});
jest.setTimeout(300 * 1000);

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

let compoundAccounts;
let compoundParams;
let sickCompoundAccounts;
// TODO native .sol tests 
// foundry solidity tests 
beforeAll(async () => {
    if (process.env.REDIS_STARTED === "false") {
        assert(shell.exec(`docker run --name myredis -d -p ${TestConstants.ENDPOINTS.REDIS_PORT}:${TestConstants.ENDPOINTS.REDIS_PORT} -v /d/redis_0:/data redis redis-server --save 60 1 --loglevel warning`).code === 0);
        console.log('redis started');
    }

    // TODO stop async run when test exits
    // ie a shutdown handle
    if (process.env.LOCAL_NODE_STARTED === "false") {
        // needs to be async since the node continues to run
        shell.exec(`FORK_BLOCKNUMBER=${TestConstants.FORK.blockNumber} npx -c 'hardhat node'`, {async:true, silent:true});
        await sleep(TestConstants.PARAMS.NODE_STARTUP_TIME_MS);
        console.log("node started");
    }
    
    function makeStoreWithProvider(provider, port=TestConstants.ENDPOINTS.REDIS_PORT) {
        let db = {
            host: TestConstants.ENDPOINTS.REDIS_HOST,
            port: port
        };
        let priceFeed = new ethers.Contract(ADDRS.OLD_UNISWAP_ANCHORED_VIEW, ABIS.OLD_UNISWAP_ANCHORED_VIEW, provider)
        let comptroller = new ethers.Contract(ADDRS.COMPOUND_COMPTROLLER, ABIS.COMPOUND_COMPTROLLER, provider);
        let store = new AccountsDbClient(db, provider, priceFeed, comptroller);
        return store;
    }

    if (process.env.DB_READY === "false") {
        let provider = new ethers.providers.JsonRpcProvider("http://localhost:8545");
        let store = makeStoreWithProvider(provider);
        await store.setCompoundAccounts(TestConstants.FORK.blockNumber);
        await store.setCompoundParams();
        compoundAccounts = await store.getStoredCompoundAccounts();
        sickCompoundAccounts = await store.getSickStoredCompoundAccounts();
        compoundParams = await store.getStoredCompoundParams();
        console.log('db has been set');
    }

    if (process.env.BOT_DEPLOYED === "false") {
        assert(shell.exec(`npx hardhat deploy`).code === 0);
        console.log("bot contract deployed");
    }
});

describe("Bot", function() {
    xtest("fetches the current most recent data about compound accounts and params with the store", async function() {
        console.log("sick accounts: \n", sickCompoundAccounts);
        console.log("params: \n", compoundParams);
    });

    // TODO also test small and medium datasets of actual liqiuidations (backtest)
    xtest("liquidates small and medium dataset of actual liquidations through the bot contract", async function() {

    });

    // 60% success rate on liquidations on a specific block (theoretical test)
    test("liquidates, directly through the bot contract, a majority of found opportunities at one blockheight, and makes close to expected profits with relaxed profit parameters so there's more oppurtunities", async function() {
        let accounts = sickCompoundAccounts;
        let params = compoundParams;

        // 3 gwei, so its cheap to liquidate so we likely liquidate 
        let lowTestingGasPrice = BigNumber.from("3000000000");
        let finder = new FindShortfallPositions( 
            accounts, 
            params,
            lowTestingGasPrice,
            provider
        );
        finder.chainId = 1337;
        finder.minProfit = 15;

        let bot = new ethers.Contract(process.env.BOT_ADDR, ABIS['BOT'], provider.getSigner());

        let arr = await finder.getLiquidationTxs();
        let countSuccesses = 0;
        let total = arr.length;
        for (let elem of arr) {
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
                        gasLimit: BigNumber.from(2000000),
                        gasPrice: elem.gasPrice
                    }
                );

                let receipt = await response.wait();
                if(receipt.status === 1) {
                    countSuccesses += 1;
                }
            } catch (e) {
                console.log(e);
            }
        }
    
        expect(countSuccesses / total * 100).toBeGreaterThan(80);
    });

    // todo make this a infra test of acutally using flashbots infra, serializing, backrunning, etc
    xtest("reconstructs tx data with signature from geth txpool", async function(){
        assert(shell.exec(`FORK_BLOCKNUMBER=${TestConstants.FORK_3.blockNumber} npx hardhat node`).code == 0);
        let provider = new ethers.providers.JsonRpcProvider("http://localhost:8545");

        let tx = TestConstants.FORK_3.tx_1;
        let txParams = {
            to: tx.to,
            nonce: "0x"+tx.nonce.toString(16),
            gasLimit: "0x"+tx.gas.toString(16),
            gasPrice: BigNumber.from(tx.gasPrice).toHexString(),
            data: tx.input,
            value: BigNumber.from(tx.value).toHexString(),
            v: tx.v,
            r: tx.r, 
            s: tx.s
        }
        // let common = new Common({ chain: "mainnet", hardfork: "berlin" });
        let unserializedTx = Transaction.fromTxData(txParams);
        let serializedTx = unserializedTx.serialize(); 
        serializedTx = "0x"+serializedTx.toString('hex');
        // NOTE doesnt work because the signature is signed for mainnet and is EIP155
        provider.send("eth_sendRawTransaction", [serializedTx]);

        let txParams2 = {
            to: "0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266",
            nonce: "0x01",
            gasLimit: "0xffff",
            gasPrice: "0xffff",
            value: "0x00"
        } 

        let c = new Common({chain: 1337});
        let unserializedTx2 = Transaction.fromTxData(txParams2, c);
        let pk = Buffer.from("ac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80", "hex");
        unserializedTx2 = unserializedTx2.sign(pk);
        let serializedTx2 = unserializedTx2.serialize();
        serializedTx2 = "0x"+serializedTx2.toString("hex");
        provider.send("eth_sendRawTransaction", [serializedTx2]);
    });

});
