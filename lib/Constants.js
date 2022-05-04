require("dotenv").config({ path: __dirname + "/../.env" });

exports.ABIS = {
  OFFCHAIN_AGG: [
    `function transmit(bytes _report, bytes32[] _rs, bytes32[] _ss, bytes32 _rawVs) external`,
  ],
  UNISWAP_ANCHORED_VIEW: [
    `function validate(uint256 previousRoundId,
			int256 previousAnswer,
			uint256 currentRoundId,
			int256 currentAnswer) external returns (bool)`,
    `function price(string memory symbol) external view returns (uint)`,
  ],
  OLD_UNISWAP_ANCHORED_VIEW: [
    `function price(string memory symbol) external view returns (uint)`,
    `function postPrices(bytes[], bytes[], string[]) external`,
  ],
  COMPOUND_COMPTROLLER: [
    `function markets(address cTokenAddress) external view returns (bool, uint, bool)`,
    `function closeFactorMantissa() external view returns (uint)`,
    `function liquidationIncentiveMantissa() view returns (uint)`,
    `function liquidateCalculateSeizeTokens(
            address cTokenBorrowed, 
            address cTokenCollateral, 
            uint actualRepayAmount
        ) external view returns (uint, uint)`,
    `function _setCloseFactor(uint newCloseFactorMantissa) external returns (uint)`,
    `function _setCollateralFactor(CToken cToken, uint newCollateralFactorMantissa) external returns (uint)`,
    `function _setLiquidationIncentive(uint newLiquidationIncentiveMantissa) external returns (uint)`,
  ],
  C_TOKEN: [
    `function exchangeRateCurrent() external returns (uint)`,
    "function exchangeRateStored() public view returns (uint)",
    "function liquidateBorrow(address borrower, uint repayAmount, address collateral) external returns (uint)",
    "function liquidateBorrow(address borrower, address collateral) payable external"
  ],
  BOT: [
    `function liquidateBorrowAllowed(
            address cTokenBorrowed,
            address cTokenCollateral,
            address liquidator,
            address borrower,
            uint repayAmount) external`,
    `function seizeAllowed(
            address cTokenBorrowed,
            address cTokenCollateral,
            address borrower,
            uint seizeTokens
        ) external`,
    `function liquidate(
            address cTokenBorrowed,
            address tokenBorrowed,
            address cTokenCollateral,
            address tokenCollateral,
            address borrower,
            uint repayAmount,
            uint maxSeizeTokens
        ) external`,
    `function liquidateCalculateSeizeTokens(
            address cTokenBorrowed,
            address cTokenCollateral,
            uint repayAmount
        ) external`,
    `event Result(uint256 code)`,
  ],
  aggregatorABI: [
    `function latestRoundData() external view 
        returns (
            uint80 roundId, 
            int256 answer, 
            uint256 startedAt, 
            uint256 updatedAt, 
            uint80 answeredInRound
        )`,
  ],
  AAVE_V2_LENDING_POOL: [
    `function getUserAccountData(address user) external view returns (
            uint256, 
            uint256,
            uint256,
            uint256,
            uint256,
            uint256
        )`,
    `function flashLoan(
            address receiverAddress, 
            address[] calldata assets, 
            uint256[] calldata amounts, 
            uint256[] modes, 
            address onBehalfOf, 
            bytes calldata params, 
            uint16 referralCode
        )`,
  ],
};

exports.ADDRS = {
  ETH_USD_AGG: "0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419",
  COMPOUND_COMPTROLLER: "0x3d9819210A31b4961b30EF54bE2aeD79B9c9Cd3B",
  UNISWAP_ANCHORED_VIEW: "0x841616a5CBA946CF415Efe8a326A621A794D0f97",
  OLD_UNISWAP_ANCHORED_VIEW: "0x922018674c12a7f0d394ebeef9b58f186cde13c1",
  AAVE_V2_LENDING_POOL: "0x7d2768dE32b0b80b7a3454c06BdAc94A69DDc7A9",

  cETH: "0x4ddc2d193948926d02f9b1fe9e1daa0718270ed5",
  cDAI: "0x5d3a536e4d6dbd6114cc1ead35777bab948e3643",
  cWBTC: "0xc11b1268c1a384e55c48c2391d8d480264a3a7f4",
  cBAT: "0x6c8c6b02e7b2be14d4fa6022dfd6d75921d90e4e",
  cUSDC: "0x39aa39c021dfbae8fac545936693ac917d5e7563",
  cUSDT: "0xf650c3d88d12db855b8bf7d11be6c55a4e07dcc9",
  cUNI: "0x35A18000230DA775CAc24873d00Ff85BccdeD550",
  cZRX: "0xb3319f5d18bc0d84dd1b4825dcde5d5f7266d407",
  cCOMP: "0x70e36f6BF80a52b3B46b3aF8e106CC0ed743E8e4",
  cREP: "0x158079ee67fce2f58472a96584a73c7ab9ac95c1",
  cSAI: "0xf5dce57282a584d2746faf1593d3121fcac444dc",
  cLINK: "0xface851a4921ce59e912d19329929ce6da6eb0c7",
  cTUSD: "0x12392f67bdf24fae0af363c24ac620a2f67dad86",

  WETH: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
  USDC: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
  DAI: "0x6B175474E89094C44Da98b954EedeAC495271d0F",
  WBTC: "0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599",
  BAT: "0x0D8775F648430679A709E98d2b0Cb6250d2887EF",
  UNI: "0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984",
  ZRX: "0xE41d2489571d322189246DaFA5ebDe1F4699F498",
  USDT: "0xdAC17F958D2ee523a2206206994597C13D831ec7",
  COMP: "0xc00e94Cb662C3520282E6f5717214004A7f26888",
  LINK: "0x514910771af9ca656af840dff83e8264ecf986ca",
  TUSD: "0x0000000000085d4780B73119b644AE5ecd22b376",

  VALIDATOR_PROXY: {
    ETH: "0x264BDDFD9D93D48d759FBDB0670bE1C6fDd50236",
    DAI: "0xb2419f587f497CDd64437f1B367E2e80889631ea",
    WBTC: "0x4846efc15CC725456597044e6267ad0b3B51353E",
    UNI: "0x70f4D236FD678c9DB41a52d28f90E299676d9D90",
    COMP: "0xE270B8E9d7a7d2A7eE35a45E43d17D56b3e272b1",
    ZRX: "0x5c5db112c98dbe5977A4c37AD33F8a4c9ebd5575",
    BAT: "0xeBa6F33730B9751a8BA0b18d9C256093E82f6bC2",
    LINK: "0xBcFd9b1a97cCD0a3942f0408350cdc281cDCa1B1",
    REP: "0x90655316479383795416B615B61282C72D8382C1",
  },

  // 8 decimal places
  OFFCHAIN_AGG: {
    ETH: "0x37bC7498f4FF12C19678ee8fE19d713b87F6a9e6",
    DAI: "0xDEc0a100eaD1fAa37407f0Edc76033426CF90b82",
    WBTC: "0xAe74faA92cB67A95ebCAB07358bC222e33A34dA7",
    UNI: "0x68577f915131087199Fe48913d8b416b3984fd38",
    COMP: "0x6eaC850f531d0588c0114f1E93F843B78669E6d2",
    BAT: "0xd90CA9ac986e453CF51d958071D68B82d17a47E6",
    LINK: "0xDfd03BfC3465107Ce570a0397b247F546a42D0fA",
    REP: "0x9AdF01321833A5Cba51B9f8A4C420C7e62481Ae5",
    ZRX: "0x3d47eF9690Bd00C77c568b73140dC20F34453766",
  },
};

exports.ENDPOINTS = {
  THE_GRAPH: `https://api.thegraph.com/index-node/graphql`,
  COMPOUND_SUBGRAPH: `https://api.thegraph.com/subgraphs/name/graphprotocol/compound-v2`,
  FLASHBOTS_GET_BLOCKS: `https://blocks.flashbots.net/v1/blocks`,
  COINBASE_REPORTER: `https://api.pro.coinbase.com/oracle`,
  ALCHEMY: `https://eth-mainnet.alchemyapi.io/v2/${process.env.ALCHEMY_KEY}`,
  INFURA: `https://mainnet.infura.io/v3/${process.env.INFURA_KEY}`,
  ROPSTEN: `https://ropsten.infura.io/v3/${process.env.INFURA_KEY}`,
};

exports.PARAMS = {
  /* Include liquidation, flashloan, and swap operations. */
  LIQUIDATION_GAS_UPPER_BOUND: 1.3e6,
  POST_PRICES_GAS_UPPER_BOUND: 300000,
  GAS_USED_UPPER_BOUND: 1.3e6 + 210000,
  /* Scenario: 20k collateral * 1.1 = 2k profit -> 90% go to miner ->
   2k - 1.8k -> leaves 200$ profit. MIN_LIQ_PROFIT =
   Collateral_size * Liq_incentive * Fraction_left_after_mev */
  MIN_LIQ_PROFIT: 200,
  DB_UPDATE_ACCOUNTS_SCHEDULE: {
    second: 1
  },
  DB_UPDATE_PARAMS_SCHEDULE: {
    second: 1
  },
  CHECK_SCHEDULE: {
    second: 1
  },
  ELAPSED_TIME_TO_PROCESS_DB_MS: 8000,
  WAIT_TIME_FOR_DB_TO_INIT_MS: 180000,
  v2_WINNING_GAS_PRICE_FRACTION_TO_PAY_MINER: 0.80,
  FLASHLOAN_RATE: 0.0009,
  UNISWAP_FEE_RATE: 0.003
};
