// (process.env.NODE_ENV !== "production") ? 
//         await FlashbotsBundleProvider.create(
//             this.signerWithProvider.provider,
//             this.flashbotsAuthSigner,
//             "https://relay-goerli.flashbots.net/",
//             "goerli"
//           )
//         : 



        
//     process.env.NODE_ENV !== "production"
//     ? new ethers.providers.JsonRpcProvider(ENDPOINTS.GOERLI)
//     : 



// const AccountsDbClient = require("../lib/AccountsDbClient");
// const { AbiCoder } = require("@ethersproject/abi");
// const { ethers } = require("ethers");
// const { ADDRS, ABIS, ENDPOINTS } = require("./lib/Constants");
// const Uniswap = require("@uniswap/sdk");
// const { Token, TokenAmount } = require("@uniswap/sdk");
// const Runner = require("./lib/Runner");
// const Poller = require("./lib/Poller");
// const Utils = require("./lib/Utils");

// const ipc = require("node-ipc");
// ipc.config.id = "baz";

// ipc.serve(() => {
//   ipc.server.on("message", (data, socket) => {
//     ipc.server.emit(socket, "message", data + " meenie");
//   });
// });

// ipc.server.start();


// let accountsDbClinet = new AccountsDbClient();
// while (true) {
//     accountsDbClinet.setCompoundAccountsInDb().then(() => {
//         setTimeout(() => {}, 5000);
//     });
// }

// while(true) {
//     new Promise((resolve, reject) => {
//         setTimeout(() => resolve(1), 1000);
//     }).then((res) => {
//         console.log(res);
//     });
// }
// function sleep(n) {
//     return new Promise(resolve => setTimeout(resolve, n));
// }

// async function main() {
//     while(true) {
//         console.log(1);
//         await sleep(1000);
//     }
// }

// async function main() {
//     let AccountsDbClient = require('../../lib/AccountsDbClient');
//     let db = new AccountsDbClient();
//     await db.getStoredCompoundAccounts();
// }
// main().then(()=>{});

// ok so setimeout only makes the callback inside wait, i can just sleep
// class Foo {
//     constructor() {
//         this.hello = "world"
//     }

//     sleep(ms) {
//         return new Promise(resolve => setTimeout(resolve, ms));
//     }

//     bar() {
//         // await sleep(5000);
//         console.log("hello");
//         // return 1 + 1;
//     }
// }

// let foo = new Foo();

// let dp = new DynamicPool(32);
// dp.exec({
//     task: n => n[1] + 1,
//     param: [1,2]
// }).then(res => foo.bar());

// const express = require("express");
// class MyClass {
//     constructor() {
//         this.app = express();
//         this.app.listen(6969);
//     }
// }
// let myClass = new MyClass();
// while(true) {}
// class Foo{
//     constructor() {
//         this.baz = 1;
//     }
//     bar() {
//         console.log(this.baz);
//     }
// }

// function sleep(ms) {
//     return new Promise(resolve => setTimeout(resolve, ms));
// }

// let a = 'a';
// let b = 'b';

// const cluster = require('cluster');

// if(cluster.isPrimary) {
//     let worker = cluster.fork();
//     worker.send('a');

//     let worker2 = cluster.fork();
//     worker2.send('b');

//     let worker3 = cluster.fork();
//     worker3.send('c');
// } else {
//     process.on('message', async (msg) => {
//         if(msg === 'a') {
//             while(true) {
//                 console.log(a);
//                 await sleep(2000);
//             }
//         } else if(msg === 'b') {
//             while(true) {
//                 console.log(b);
//                 await sleep(4000);
//             }
//         } else {
//             const express = require('express');
//             let app = express();
//             app.listen(1000);
//         }
//     })
// }

// const ipc = require('node-ipc');

// const { fork } = require('child_process');
// fork(__dirname + "/etc2.js");

// const otherIpc = new ipc.IPC;
// otherIpc.config.id = "bar";
// otherIpc.connectTo('baz', () => {
//     otherIpc.of.baz.on('connect', () => {
//         otherIpc.of.baz.emit("message", "eenie");
//     });
//     otherIpc.of.baz.on("message", (data) => {
//         console.log(data);
//     })
// });

// function sleep(n) {
//     return new Promise(resolve => setTimeout(resolve, n));
// }
// async function foo() {
//     await sleep(3000);
//     console.log('foo');
// }

// foo();
// console.log('bar');
// console.log(__dirname);

// const { ethers, BigNumber } = require("ethers");
// let coder = new ethers.utils.AbiCoder();
// let coded = coder.encode(['address', 'uint256'], ["0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266", 12345]);
// console.log(coded);

// async function main() {
//     let provider = new ethers.providers.JsonRpcProvider("http://localhost:8545");
//     let cuni = new ethers.Contract(ADDRS.cUNI, ABIS.C_TOKEN, provider.getSigner());
//     console.log(await cuni.exchangeRateStored());
//     // let foo = await cuni.exchangeRateCurrent();
//     // let bar = await foo.wait();
//     // console.log(bar);
//     // let coder = new ethers.utils.AbiCoder();
//     // let decoded = coder.decode(['uint256'], ['0x000000000000000000000000000000000000000000097eb4a06744a4e00d911a000000000000000000000000000000000000000000000000002600751f70c4aa0000000000000000000000000000000000000000000000000ea7c5078964005a000000000000000000000000000000000000000000007f28d4bce24471c2b18a']);
//     // console.log(decoded);
//    // .0202037004179492503231589214
// }

// FEATURE the idea to use flashswaps to artificially raise or lower prices!

// async function main() {
//     let provider = new ethers.providers.JsonRpcProvider("http://localhost:8545");

//     // let anchoredPriceFeedContract = new ethers.Contract(ADDRS['UNISWAP_ANCHORED_VIEW'], ABIS['UNISWAP_ANCHORED_VIEW'], provider);
//     // console.log(await anchoredPriceFeedContract.price("UNI"));
//     // process.exit()

//     // const DAI = new Token(1337, '0x6B175474E89094C44Da98b954EedeAC495271d0F', 18)
//     const UNI = new Uniswap.Token(1337, '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984', 18);
//     const WETH = new Uniswap.Token(1337, '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', 18);
//     const USDT = new Uniswap.Token(1337, '0xdAC17F958D2ee523a2206206994597C13D831ec7', 6);
//     // const COMP = new Uniswap.Token(1337, "0xc00e94Cb662C3520282E6f5717214004A7f26888", 18);

//     const wethuni = await Uniswap.Fetcher.fetchPairData(WETH, UNI, provider);
//     const usdtweth = await Uniswap.Fetcher.fetchPairData(USDT, WETH, provider);

//     // const uniusdt = await Uniswap.Fetcher.fetchPairData(UNI, USDT, provider);
//     // const usdtcomp = await Uniswap.Fetcher.fetchPairData(USDT, COMP, provider);
//     // const route2 = new Uniswap.Route([usdtcomp], COMP);
//     // const trade2 = new Uniswap.Trade(route2, new TokenAmount(USDT, '100000000'), Uniswap.TradeType.EXACT_OUTPUT);

//     const route = new Uniswap.Route([wethuni, usdtweth], UNI, USDT);
//     const trade = new Uniswap.Trade(route, new TokenAmount(USDT, '1000000000'), Uniswap.TradeType.EXACT_OUTPUT);

//     console.log(trade.executionPrice.toSignificant(6));
//     // console.log(route.midPrice.toSignificant(6));
//     // console.log(trade.inputAmount.raw.toString());

// }

// main().then();

// let provider = new ethers.providers.JsonRpcProvider(ENDPOINTS.INFURA);
// let signer = new ethers.Wallet('0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80', provider);
// signer.signTransaction({to: "0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984"}).then(res => console.log(typeof res));

// let interface = new ethers.utils.Interface(ABIS.UNISWAP_ANCHORED_VIEW);
// const i2 = new ethers.utils.Interface(ABIS.OFFCHAIN_AGG);
// // let data = "0xbeed9b510000000000000000000000000000000000000000000000000000000000000a31000000000000000000000000000000000000000000000000000000000425b97b0000000000000000000000000000000000000000000000000000000000000a32000000000000000000000000000000000000000000000000000000000422ba3b";
// const d2 =
//   "0xc9807539000000000000000000000000000000000000000000000000000000000000008000000000000000000000000000000000000000000000000000000000000003200000000000000000000000000000000000000000000000000000000000000400010100010000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000002800000000000000000000000d06422028a6e5ef9f0f31d40c4f3888700004b190609010c07040b030d08060205000a0f0e0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000600000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000421210000000000000000000000000000000000000000000000000000000000042148100000000000000000000000000000000000000000000000000000000004218406000000000000000000000000000000000000000000000000000000000421d0f80000000000000000000000000000000000000000000000000000000004224971000000000000000000000000000000000000000000000000000000000422497100000000000000000000000000000000000000000000000000000000042249710000000000000000000000000000000000000000000000000000000004224971000000000000000000000000000000000000000000000000000000000422ba3b000000000000000000000000000000000000000000000000000000000422ba3b000000000000000000000000000000000000000000000000000000000423980f00000000000000000000000000000000000000000000000000000000042449f600000000000000000000000000000000000000000000000000000000042450470000000000000000000000000000000000000000000000000000000004251607000000000000000000000000000000000000000000000000000000000425a9ab000000000000000000000000000000000000000000000000000000000425f8830000000000000000000000000000000000000000000000000000000000000006d9b688736ef25c29dc36bd160f3d5560115bcd720cbbfcb47c4adf81505b920c67efb8ef720c6902e1a242e4347e3bf11619e4bd828b5e648d3418619d268a66138cf53183cd5a34c1bd7412fcaeec6eb854dd4186abbc0a356f0d0fd8651e3d977d60aa48ac9bc2542fbdee236e96e6827aa4c0b52b8d0e1431c9a34221376f98dab86a03fdbb62e29ad40464f2b2d001865c5eb55084291c33ebe61bbce27853a4c6937805d3818885051afe930f2e4a8757c99f3ed000738b17f13e91ebab000000000000000000000000000000000000000000000000000000000000000678afbd6fe1010e125e5d318c6eecb1b0e380c6999997d2a104323c93fbef11da2096f35af84c9d680d8146313c764ac7979142773e028d5e9f5f81d9c350bf4366460414fef0ee5cfe12d34cfa4113580f2c74a2d04271497a9fbf801867689322025ef6386b76bb492b3357a3a25ec5206fccb362fefa15b30c1984612871cb04e491af0ce829a10914384590057c9d512273b0697fc66cb20f38b8f5193aa11be07a0edcd4134191cd69c2c70bb8ace6149279954ca49cfa5d443f5d885d9e";

// // interface.parseTransaction({data: data});
// // interface.decodeFunctionData("acceptOwnership", data);

// const decoded = i2.parseTransaction({ data: d2 });
// const result = decoded.args[0];
// // console.log(result);
// const decoder = new ethers.utils.AbiCoder();
// const res = decoder.decode(["bytes32", "bytes32", "int192[]"], result);
// console.log(res);
// const prices = res[2];
// const price = prices[0];
// console.log(i2.decodeFunctionData('transmit', d2));



// const cluster = require('cluster');
// will need to ipc.config.unlink and then maybe stop server on sigint
// if(cluster.isPrimary) {
//     for(let i = 0; i < 2; i++) {
//         cluster.fork();
//     }
// } else if(cluster.isWorker) {
//     logger.info(`start cluster node of runner with pid ${process.pid}`);
//     main().catch(e => {
//         console.error("CRITICAL ERROR:", e)
//         process.exit(1);
//     });
// }

// const piscina = new Piscina({
//   filename: __dirname + "/RunnerWorker.js",
//   idleTimeout: 10000,
//   env: {

//   },
// });

// piscina.run(finderData).catch((e) => {
//   throw e;
// });