const { BigNumber } = require("ethers");

// Mostly borrowed USDC/DAI to go long ETH/WBTC collateral. 
// Some collateral USDC to borrowed DAI. 

exports.FORK = {
  blockNum: 14053711 - 15
}

exports.MATH_ERROR_FORK = {
  user: "0x59df18148171fe8fc7ad263dc4eba9e25e03522e",
  blockNum: 14743676,
}

exports.FORK_2 = {
  blockNumPrev: 14053711 - 15,
  baseFee: "132628475535",
  borrower: "0x086DBCF9d25b476AAbA8Ae02ceA177870D27B64C",
  indexedData: {
    "blockNumber": 14053711,
    "underlyingRepayAmount": "105994.181664",
    "underlyingSymbol": "USDC",
    "cTokenSymbol": "cETH",
    "blockTime": 1642831509,
    "from": "0x086dbcf9d25b476aaba8ae02cea177870d27b64c",
    "to": "0x33334570f7e1df34a09377c7f327feb65e2b3faf",
    "amount": "2284.83252312",
    "id": "0x0073462f84bb56250aa41ae910240f4a2cce727b29faa2723848c9a721f408b3-238"
  },
  arb: {
    blockNum: 14053711 - 1,
    cTokenBorrowed: '0x39aa39c021dfbae8fac545936693ac917d5e7563',
    cTokenCollateral: '0x4Ddc2D193948926D02f9B1fE9e1daa0718270ED5',
    // USDC-WETH
    tokenBorrowed: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
    tokenCollateral: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
    borrower: '0x086dbcf9d25b476aaba8ae02cea177870d27b64c',
    repayAmount: BigNumber.from("105982521309") ,
    maxSeizeTokens: BigNumber.from("42871931848053079888"),
    gasLimit: BigNumber.from("1300000"),
    gasPrice: BigNumber.from("132628475535"),
    netProfitGivenBaseFee: 3905.4985829225184
  },
  noBackrunArb: {
    blockNum: 14053711 - 1,
    cTokenBorrowed: '0x5d3a536E4D6DbD6114cc1Ead35777bAB948E3643',
    cTokenCollateral: '0x4Ddc2D193948926D02f9B1fE9e1daa0718270ED5',
    // DAI-WETH
    tokenBorrowed: '0x6B175474E89094C44Da98b954EedeAC495271d0F',
    tokenCollateral: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
    borrower: '0x00726d1346296312D44c45f77403D6fA970eC296',
    repayAmount: BigNumber.from("36056954471424240000000") ,
    maxSeizeTokens: BigNumber.from("14623208136727129938"),
    gasLimit: BigNumber.from("1300000"),
    baseFee: BigNumber.from("3000000000"),
    netProfitGivenBaseFee: 1379.7859663142797
  }
};

exports.FORK_1 = {
  blockNumPrev: 14047243 - 1,
  borrower: "0x360c770ff59b4e9ac2d61d943f92dc7b6db3a48e",
  baseFee: "97380424050",
  description: `No transmit call in its block, i.e. no price update 
  seemed to have caused the liquidation within the same block (Etherscan). 
  Flashbots also doesn't show it, so it didn't go through flashbots.
  It's health factor was around 0.96 at the start of the block already. 
  Finder does not work on this, even seeming without a backrun tx needed. 
  There seems to be a Uniswap issue.`,
  indexedData: {
    blockNumber: 14047243,
    underlyingRepayAmount: "1518.136849739710498544",
    underlyingSymbol: "DAI",
    cTokenSymbol: "cETH",
    blockTime: 1642744961,
    from: "0x360c770ff59b4e9ac2d61d943f92dc7b6db3a48e",
    to: "0x3909336de913344701c6f096502d26208210b39f",
    amount: "28.51792745",
    id: "0x006d998295087111da5ae75dd44f69b9414bfb294ebe046f1f04debf594ab518-83",
  },
}

exports.FORKS = {
  // THIS BLOCKNUM, FLASH LOANS DO NOT WORK
  blockNumber: 14574363,
  // TODO dai SafeErc20 transfer failed
  sampleLiquidation: {
    cTokenBorrowed: "0x5d3a536e4d6dbd6114cc1ead35777bab948e3643",
    cTokenCollateral: "0x39aa39c021dfbae8fac545936693ac917d5e7563",
    // DAI-USDC
    tokenBorrowed: "0x6B175474E89094C44Da98b954EedeAC495271d0F",
    tokenCollateral: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
    borrower: "0xd6b5986a966d084580226bed115d9c30c4fdedaa",
    repayAmount: {
      type: "BigNumber",
      hex: "0x12fea46ba741b041e500",
    },
    maxSeizeTokens: {
      type: "BigNumber",
      hex: "0x1570966ac2",
    },
    gasLimit: {
      type: "BigNumber",
      hex: "0x13d620",
    },
    baseFee: {
      type: "BigNumber",
      hex: "0x0a",
    },
    netProfitGivenBaseFee: 9636036.908778217,
  },
  sampleLiquidation2: {
    cTokenBorrowed: "0x39AA39c021dfbaE8faC545936693aC917d5E7563",
    cTokenCollateral: "0xC11b1268C1A384e55C48c2391d8d480264A3A7F4",
    // USDC-WBTC
    tokenBorrowed: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
    tokenCollateral: "0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599",
    borrower: "0x1A0d5ec1273Ce0fcf82Aae5E9FC2e1BB475e1E16",
    repayAmount: {
      type: "BigNumber",
      hex: "0x338360e8e2",
    },
    maxSeizeTokens: {
      type: "BigNumber",
      hex: "0x27af9b9a",
    },
    gasLimit: {
      type: "BigNumber",
      hex: "0x13d620",
    },
    baseFee: {
      type: "BigNumber",
      hex: "0x0a",
    },
    netProfitGivenBaseFee: 15169.674211092199,
  },
  sampleLiquidation3: {
    cTokenBorrowed: "0x5d3a536e4d6dbd6114cc1ead35777bab948e3643",
    cTokenCollateral: "0xc11b1268c1a384e55c48c2391d8d480264a3a7f4",
    tokenBorrowed: "0x6B175474E89094C44Da98b954EedeAC495271d0F",
    tokenCollateral: "0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599",
    borrower: "0xc4577c19cbef64edf90663b0908ef04564b8626e",
    repayAmount: {
      type: "BigNumber",
      hex: "0x1b4a67e5ea2d587e3100",
    },
    maxSeizeTokens: {
      type: "BigNumber",
      hex: "0x1763d29d",
    },
    gasLimit: {
      type: "BigNumber",
      hex: "0x13d620",
    },
    baseFee: {
      type: "BigNumber",
      hex: "0x0a",
    },
    netProfitGivenBaseFee: 7858.394366427714,
  },
  sampleLiquidation4: {
    cTokenBorrowed: "0x39aa39c021dfbae8fac545936693ac917d5e7563",
    cTokenCollateral: "0xc11b1268c1a384e55c48c2391d8d480264a3a7f4",
    tokenBorrowed: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
    tokenCollateral: "0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599",
    borrower: "0xe7b3822682daf8973ffba472713b8416e48ec307",
    repayAmount: {
      type: "BigNumber",
      hex: "0x196876b8a6",
    },
    maxSeizeTokens: {
      type: "BigNumber",
      hex: "0x13862047",
    },
    gasLimit: {
      type: "BigNumber",
      hex: "0x13d620",
    },
    baseFee: {
      type: "BigNumber",
      hex: "0x0a",
    },
    netProfitGivenBaseFee: 7774.889924154085,
  },
  sampleLiquidation5: {
    cTokenBorrowed: "0x5d3a536e4d6dbd6114cc1ead35777bab948e3643",
    cTokenCollateral: "0x39aa39c021dfbae8fac545936693ac917d5e7563",
    tokenBorrowed: "0x6B175474E89094C44Da98b954EedeAC495271d0F",
    tokenCollateral: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
    borrower: "0xbe93b15b0ee97865790359701c4268b16f102bb7",
    repayAmount: {
      type: "BigNumber",
      hex: "0x023aab6c979654c60080",
    },
    maxSeizeTokens: {
      type: "BigNumber",
      hex: "0x02829b8265",
    },
    gasLimit: {
      type: "BigNumber",
      hex: "0x13d620",
    },
    baseFee: {
      type: "BigNumber",
      hex: "0x0a",
    },
    netProfitGivenBaseFee: 1130890.7395863656,
  },
  sampleLiquidation6: {
    cTokenBorrowed: "0x5d3a536e4d6dbd6114cc1ead35777bab948e3643",
    cTokenCollateral: "0x39aa39c021dfbae8fac545936693ac917d5e7563",
    tokenBorrowed: "0x6B175474E89094C44Da98b954EedeAC495271d0F",
    tokenCollateral: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
    borrower: "0x10f69553c7b482536155cdc8d904ae833ed55f98",
    repayAmount: {
      type: "BigNumber",
      hex: "0x0392249628a0e2f88f80",
    },
    maxSeizeTokens: {
      type: "BigNumber",
      hex: "0x040592bc33",
    },
    gasLimit: {
      type: "BigNumber",
      hex: "0x13d620",
    },
    baseFee: {
      type: "BigNumber",
      hex: "0x0a",
    },
    netProfitGivenBaseFee: 1811545.3452327037,
  },
  sampleLiquidation7: {
    cTokenBorrowed: "0x5d3a536e4d6dbd6114cc1ead35777bab948e3643",
    cTokenCollateral: "0xc11b1268c1a384e55c48c2391d8d480264a3a7f4",
    tokenBorrowed: "0x6B175474E89094C44Da98b954EedeAC495271d0F",
    tokenCollateral: "0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599",
    borrower: "0xa58655f2b939129c1f7087679a8a42f12e48973f",
    repayAmount: {
      type: "BigNumber",
      hex: "0x024cc9f8d6e9245e6c80",
    },
    maxSeizeTokens: {
      type: "BigNumber",
      hex: "0x01f6a7e3",
    },
    gasLimit: {
      type: "BigNumber",
      hex: "0x13d620",
    },
    baseFee: {
      type: "BigNumber",
      hex: "0x0a",
    },
    netProfitGivenBaseFee: 706.9663775589081,
  },
  sampleLiquidation8: {
    cTokenBorrowed: "0x39aa39c021dfbae8fac545936693ac917d5e7563",
    cTokenCollateral: "0xc11b1268c1a384e55c48c2391d8d480264a3a7f4",
    tokenBorrowed: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
    tokenCollateral: "0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599",
    borrower: "0x19eb2688e698f540f77ead8d42b0993616fa656d",
    repayAmount: {
      type: "BigNumber",
      hex: "0x3cc61d6559",
    },
    maxSeizeTokens: {
      type: "BigNumber",
      hex: "0x2edd0c92",
    },
    gasLimit: {
      type: "BigNumber",
      hex: "0x13d620",
    },
    baseFee: {
      type: "BigNumber",
      hex: "0x0a",
    },
    netProfitGivenBaseFee: 17647.558983082316,
  },
  sampleLiquidation9: {
    cTokenBorrowed: "0x39aa39c021dfbae8fac545936693ac917d5e7563",
    cTokenCollateral: "0xc11b1268c1a384e55c48c2391d8d480264a3a7f4",
    tokenBorrowed: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
    tokenCollateral: "0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599",
    borrower: "0x09f72016db46357d0e3ced69f69fb9d20c590d8f",
    repayAmount: {
      type: "BigNumber",
      hex: "0x08442f56dd",
    },
    maxSeizeTokens: {
      type: "BigNumber",
      hex: "0x06575b05",
    },
    gasLimit: {
      type: "BigNumber",
      hex: "0x13d620",
    },
    baseFee: {
      type: "BigNumber",
      hex: "0x0a",
    },
    netProfitGivenBaseFee: 2591.7688826220106,
  },
  sampleLiquidation10: {
    cTokenBorrowed: "0x5d3a536e4d6dbd6114cc1ead35777bab948e3643",
    cTokenCollateral: "0x39aa39c021dfbae8fac545936693ac917d5e7563",
    tokenBorrowed: "0x6B175474E89094C44Da98b954EedeAC495271d0F",
    tokenCollateral: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
    borrower: "0x3f118a672806d3c031e64c6ac2f429533a79a12b",
    repayAmount: {
      type: "BigNumber",
      hex: "0x01197c4e63182ba0a4d400",
    },
    maxSeizeTokens: {
      type: "BigNumber",
      hex: "0x0149f42cf988",
    },
    gasLimit: {
      type: "BigNumber",
      hex: "0x13d620",
    },
    baseFee: {
      type: "BigNumber",
      hex: "0x0a",
    },
    netProfitGivenBaseFee: 142745754.10408154,
  },
  ETH_OFFCHAIN_AGG_TRANSMIT_CALL: {
    accessList: [],
    blockHash:
      "0x857ca1f96715f79c4bce1926a7c398bf027626e1dfa86d9c49aa30658add3608",
    blockNumber: 14574364,
    chainId: "0x1",
    from: "0x61317c73d0225b2e37140fb9664d607b450613c6",
    gas: 500000,
    gasPrice: 47813190555,
    hash: "0x3ae25710e5cb4776725817be61830c1912c90130b8b58e36bbd4612f423ee4d8",
    input:
      "0xc98075390000000000000000000000000000000000000000000000000000000000000080000000000000000000000000000000000000000000000000000000000000050000000000000000000000000000000000000000000000000000000000000006800100000000000001010000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000046000000000000000000000009f88d5f42679b75c4a0244716f695ef30000e8090312141e131906150e0409071b0b18050108030a0f1a101600171c020d111d0c000000000000000000000000000000000000000000000000000000000000000060000000000000000000000000000000000000000000000000000000000000001f00000000000000000000000000000000000000000000000000000046732a0347000000000000000000000000000000000000000000000000000000467bded23b000000000000000000000000000000000000000000000000000000467bded23b000000000000000000000000000000000000000000000000000000467bded23b000000000000000000000000000000000000000000000000000000467f182700000000000000000000000000000000000000000000000000000000467f45401d0000000000000000000000000000000000000000000000000000004680e371200000000000000000000000000000000000000000000000000000004680e371200000000000000000000000000000000000000000000000000000004681c6cc400000000000000000000000000000000000000000000000000000004682a5162a0000000000000000000000000000000000000000000000000000004682abae000000000000000000000000000000000000000000000000000000004682abae000000000000000000000000000000000000000000000000000000004682daa727000000000000000000000000000000000000000000000000000000468325c00000000000000000000000000000000000000000000000000000000046849ea6b300000000000000000000000000000000000000000000000000000046851d4a4000000000000000000000000000000000000000000000000000000046855b746800000000000000000000000000000000000000000000000000000046864568ef00000000000000000000000000000000000000000000000000000046866a7ee400000000000000000000000000000000000000000000000000000046866a7ee400000000000000000000000000000000000000000000000000000046866cfbc00000000000000000000000000000000000000000000000000000004686aa04c00000000000000000000000000000000000000000000000000000004686aa04c00000000000000000000000000000000000000000000000000000004687ea740000000000000000000000000000000000000000000000000000000046886486000000000000000000000000000000000000000000000000000000004688de98000000000000000000000000000000000000000000000000000000004689edb281000000000000000000000000000000000000000000000000000000468a0a5d7f000000000000000000000000000000000000000000000000000000468caf2800000000000000000000000000000000000000000000000000000000468d24db8000000000000000000000000000000000000000000000000000000046940506ef000000000000000000000000000000000000000000000000000000000000000be05f3704941439aa7e47e3d5b272a6c4834f175705a9ced193b834fccba4cb11683c3cf8403b9aea33eff11b81de161a1f2150354879ec33e4ec21f70e091a9bcdd907519e449c6f4411ab80955e08f003323dc289982b7f944f1a364b432d61cb0742ad0d5a97e7490031e82c7a956e63469920c026557aa04fc44316727efd18255beb66f724a86dbfe69d672e55c6e585411a2bc81e60724ad304307d9ae9e8486ed17cad228afffc5e552736ced65fc6587410f39ba53d3a3598e10e82c2c574222146f14f9bc9d1a8b8f5b8ff9fa751b69e8a8d1d72f86a33c8b6c3054a820b736cda40898aba1d8ad72c607303429f7e417d8db8b2527dcb7430493671aa2360b8eeaa992b768977ed1e0ff2a101a1d1251ec2dc97e69b0fb2d08f5c566930205dd4c45e1a864ac7e8c4f1c3d3f84ff8033015b14443bf13c4b2479a01c38871ab2acbffe69b586a76f9dcdf93651bf2e51b2575c0ad2ea0404d060c84000000000000000000000000000000000000000000000000000000000000000b23cca1d2c7841d1cb057ac9b18a4593f07f10abed12c1b4422b1f6c6755f5e31691e41ee7f114c8b4ae2e1f5c488131d5b8189c1ef456f1433e76a5de3157c571a581044af319b772c3b3000e6c5eb22ef0ce5df1fbf4af2d73b998f13d98c0a4f84e23d234ec1213a5df6ec277615f43dfed8b81d2ba23d653c4d7bd3ae85bc2d74755f1f94b91c8b7e5f9e974631bda32a90d31db6b272c950af6d5380df9314315169ea46d5894435e9c282d667c90c6a0ff15d1b53e2bd0bd2a8f12bfcec50e6784dfb9b16a24334543fac2f208ac5186bf27b5110d04c90b963b2278aa97ed4a6267cbac45acbc6ea1520706a89c16fcaa58e191e4a7d07823256f5ca8c3648b244382935ebfc4242e52427441e3355892c28ff91dd95339c47b4871ba50319f531f3251c5639aea37657af348100cc37e753334007269e040e106ed1925a9c7dd499bac68eb1ad60365dff911bef2522c645b30c70f43890531130ddb1",
    maxFeePerGas: 67236509635,
    maxPriorityFeePerGas: 2000000000,
    nonce: 57801,
    r: "0x90859de137903e71af71d125e92cfff169afaf7f82689a90002a7a7a42a67e14",
    s: "0x615da89084b130c4b00bb4564c331b6410ca40ff2cefed2a671d511ab3123020",
    to: "0x37bc7498f4ff12c19678ee8fe19d713b87f6a9e6",
    transactionIndex: 140,
    type: "0x2",
    v: "0x1",
    value: 0,
  },
  // parameter updates do not happen often, has not happened from jan 2022-mar2022 or aug2021-nov2021
  SET_COLLATERAL_FACTOR: new Error("have not found a param update sample tx"),
};

exports.ENDPOINTS = {
  REDIS_HOST: "localhost",
  REDIS_PORT: 6379,
  REDIS_PORT_Q: 6380,
  RPC_PROVIDER: "http://localhost:8545/",
  RPC_PROVIDER_ALCHEMY: "https://eth-mainnet.alchemyapi.io/v2/o8njW3moZs0bcAMMpyuPNrlHG4DbGysF",
  RPC_PROVIDER_INFURA: "https://mainnet.infura.io/v3/e8b3009ed18d4b3c9a05fdb4bf5f2bc2",
  DEFAULT_BOT_ADDRESS: "0xE3011A37A904aB90C8881a99BD1F6E21401f1522",
  RUNNER_ENDPOINT: "http://localhost:8080",
  RUNNER_PORT: 8080,
  DEFAULT_PROXIED_ADDRESS: "0x457cCf29090fe5A24c19c1bc95F492168C0EaFdb"
};

exports.TEST_PARAMS = {
  DEFAULT_SENDER_ADDRESS: "0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266",
  DEFAULT_SENDER_PK: "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80",
  NODE_STARTUP_TIME_MS: 4000,
  TEST_RUNNER_FLAG: "test_runner",
  DB_NUMBER_DATA: 0,
  DB_NUMBER_JOBS: 1,
  DB_NUMBER_MISC: 5,
  NUM_WORKERS: 5,

  STANDARD_BASEFEE: "30100000000",
  LOW_BASEFEE: "3100000000",
  HIGH_BASEFEE: "300100000000",
};
