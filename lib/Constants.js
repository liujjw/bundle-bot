require("dotenv").config({ path: __dirname + "/../.env" });
const ethers = require("ethers");

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
    // "function liquidateBorrow(address borrower, address collateral) payable external"
  ],
  BOT: [],
  botEncode: function(
    cTokenBorrowed,
    cTokenCollateral,
    tokenCollateral,
    borrower,
    maxSeizeTokens,
    minerPayment,
    minEthToSwapFor
  ) {
    const coder = new ethers.utils.AbiCoder();
    const params = coder.encode([
          'address', 'address', 'address', 'address', 'uint256', 'uint256', 'uint256'
    ], [
          cTokenBorrowed, cTokenCollateral, tokenCollateral, borrower, 
          maxSeizeTokens, minerPayment, minEthToSwapFor
    ]);
    return params;
  },
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
    // currentLiqThreshold and ltv scaled by 1e4
    // everything else is scaled by 1e18 incl healthFactor
    `function getUserAccountData(address user) external view returns (
            uint256 totalCollateralETH, 
            uint256 totalDebtETH,
            uint256 availableBorrowsETH,
            uint256 currentLiquidationThreshold,
            uint256 ltv,
            uint256 healthFactor
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
  AAVE_V2_LENDING_POOL_FLASHLOAN: {
    DEFAULT: {
      MODE: 0,
      REFERRAL_CODE: 0
    }
  },
  AAVE_PRICE_ORACLE: [
    "function getAssetPrice(address _asset) public view returns(uint256)",
    `function getAssetsPrices(
      address[] calldata _assets
    ) external view returns(uint256[] memory)`,
  ],
  AAVE_LIQUIDATION_CALL: [
    `function liquidationCall(
      address collateralAsset,
      address debtAsset,
      address user,
      uint256 debtToCover,
      bool receiveAToken
    ) external override returns (uint256, string memory)`,
  ],
  AAVE_PROTOCOL_DATA_PROVIDER: [
    `function getReserveConfigurationData(address asset)
      external
      view
      returns (
        uint256 decimals,
        uint256 ltv,
        uint256 liquidationThreshold,
        uint256 liquidationBonus,
        uint256 reserveFactor,
        bool usageAsCollateralEnabled,
        bool borrowingEnabled,
        bool stableBorrowRateEnabled,
        bool isActive,
        bool isFrozen
      )`,
  ],
};

exports.ADDRS = {
  BLACKLISTED_USERS: [
    
  ],
  COMPOUND_COMPTROLLER: "0x3d9819210A31b4961b30EF54bE2aeD79B9c9Cd3B",
  // the price oracle for compound
  UNISWAP_ANCHORED_VIEW: "0x65c816077C29b557BEE980ae3cC2dCE80204A0C5",

  AAVE_V2_LENDING_POOL: "0x7d2768dE32b0b80b7a3454c06BdAc94A69DDc7A9",
  AAVE_PRICE_ORACLE: "0xA50ba011c48153De246E5192C8f9258A2ba79Ca9",
  AAVE_LIQUIDATION_CALL: "0xbd4765210d4167CE2A5b87280D9E8Ee316D5EC7C",
  AAVE_PROTOCOL_DATA_PROVIDER: "0x057835Ad21a177dbdd3090bB1CAE03EaCF78Fc6d",

  cETH: "0x4Ddc2D193948926D02f9B1fE9e1daa0718270ED5",
  cDAI: "0x5d3a536E4D6DbD6114cc1Ead35777bAB948E3643",
  cWBTC: "0xC11b1268C1A384e55C48c2391d8d480264A3A7F4",
  cBAT: "0x6C8c6b02E7b2BE14d4fA6022Dfd6d75921D90E4E",
  cUSDC: "0x39AA39c021dfbaE8faC545936693aC917d5E7563",
  cUSDT: "0xf650C3d88D12dB855b8bf7D11Be6C55A4e07dCC9",
  cUNI: "0x35A18000230DA775CAc24873d00Ff85BccdeD550",
  cZRX: "0xB3319f5D18Bc0D84dD1b4825Dcde5d5f7266d407",
  cCOMP: "0x70e36f6BF80a52b3B46b3aF8e106CC0ed743E8e4",
  cREP: "0x158079Ee67Fce2f58472A96584A73C7Ab9AC95c1",
  cSAI: "0xF5DCe57282A584D2746FaF1593d3121Fcac444dC",
  cLINK: "0xFAce851a4921ce59e912d19329929CE6da6EB0c7",
  cTUSD: "0x12392F67bdf24faE0AF363c24aC620a2f67DAd86",

  WETH: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
  USDC: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
  DAI: "0x6B175474E89094C44Da98b954EedeAC495271d0F",
  WBTC: "0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599",
  BAT: "0x0D8775F648430679A709E98d2b0Cb6250d2887EF",
  UNI: "0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984",
  ZRX: "0xE41d2489571d322189246DaFA5ebDe1F4699F498",
  USDT: "0xdAC17F958D2ee523a2206206994597C13D831ec7",
  COMP: "0xc00e94Cb662C3520282E6f5717214004A7f26888",
  LINK: "0x514910771AF9Ca656af840dff83E8264EcF986CA",
  TUSD: "0x0000000000085d4780B73119b644AE5ecd22b376",

  // do not use this directly
  // offchain agg handles the prices, but only validator proxy can update
  // anchored view
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

  // backrun these tx (support the validator proxies which "write" to anchored view)
  // 8 decimal places in x units, but doesnt matter since anchored view 
  // handles upscaling to 6 decimals and y units
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

  // the price feeds supporting aave price oracle (theres also a fallback we ignore)
  // price oracle.getSourceOfAsset() 
  AAVE_CHAINLINK: {
    WBTC: "0xdeb288F737066589598e9214E782fa5A8eD689e8",
    DAI: "0x773616E4d11A78F511299002da57A0a94577F1f4",
    USDC: "0x986b5E1e1755e3C2440e960477f25201B0a8bbD4"
  },
};

exports.ENDPOINTS = {
  THE_GRAPH: `https://api.thegraph.com/index-node/graphql`,
  COMPOUND_SUBGRAPH: `https://api.thegraph.com/subgraphs/name/graphprotocol/compound-v2`,
  AAVE_SUBGRAPH: `https://api.thegraph.com/subgraphs/name/aave/protocol-v2`,
  FLASHBOTS_GET_BLOCKS: `https://blocks.flashbots.net/v1/blocks`,
  COINBASE_REPORTER: `https://api.pro.coinbase.com/oracle`,
  ALCHEMY: `https://eth-mainnet.alchemyapi.io/v2/o8njW3moZs0bcAMMpyuPNrlHG4DbGysF`,
  INFURA: `https://mainnet.infura.io/v3/e8b3009ed18d4b3c9a05fdb4bf5f2bc2`,
  ROPSTEN: `https://ropsten.infura.io/v3/e8b3009ed18d4b3c9a05fdb4bf5f2bc2`,
  GOERLI: `https://goerli.infura.io/v3/e8b3009ed18d4b3c9a05fdb4bf5f2bc2`
};

// we at 700k
const postPricesGasUsed = 310000;
const flashLoanGasUsed = 204493;
const liquidateBorrowGasUsed = 292187; // could use +100k
const redeemGasUsed = 42714;
const swapGasUsed = 173476; // could use +100k 
const transferToMinerAndOwnerGasUsed = 5000;
const upperBoundMultiple = 1.25; // +175k

exports.PARAMS = {
  // data params
  COMPOUND_NUM_TOKENS_PER_ACCOUNT: 15,
  AAVE_NUM_TOKENS_PER_ACCOUNT: 15,

  // Include liquidation, flashloan, and swap operations
  // TODO update this estimate
  COMP_LIQ_GAS_BOUND: 
    Math.floor(
      (flashLoanGasUsed + liquidateBorrowGasUsed + swapGasUsed 
        + redeemGasUsed) * upperBoundMultiple
    ),
  COMP_LIQ_GAS_BOUND_WITH_POST: 
    Math.floor(
      (flashLoanGasUsed + liquidateBorrowGasUsed + swapGasUsed + redeemGasUsed
        + postPricesGasUsed) * upperBoundMultiple
    ),
  DEPLOY_GAS_LIMIT: 2.8e6,
  
  // Infra
  // every odd minute
  DB_UPDATE_ACCOUNTS_SCHEDULE: "*/4 * * * *",
  DB_UPDATE_PARAMS_SCHEDULE: {
    second: 10
  },
  CHECK_SCHEDULE: "*/15 * * * *",
  ELAPSED_TIME_TO_PROCESS_DB_MS: 8000,
  WAIT_TIME_FOR_DB_TO_INIT_MS: 180000,

  /* Scenario: 20k collateral * 1.1 = 2k profit -> 90% go to miner ->
   2k - 1.8k -> leaves 200$ profit. MIN_LIQ_PROFIT_LESS_MEV =
   Collateral_size * Liq_incentive * Fraction_left_after_mev */
  PROFIT_FRACTION_TO_PAY_MINER: 0.97,
  MIN_LIQ_PROFIT_LESS_MEV: 100,
  MIN_LIQ_PROFIT_LESS_MEV_IN_ETH: "0.01",
  
  // Fees
  FLASHLOAN_RATE: 0.0009,
  UNISWAP_FEE_RATE: 0.003,
  SWAP_SLIPPAGE_RATIO: 0.005,
  SWAP_SLIPPAGE_FRACTION: {
    NUM: 1005,
    DENOM: 1000
  }, 

  // Data
  OFFCHAIN_AGG_DECIMALS: 8,
  UNISWAP_ANCHORED_VIEW_DECIMALS: 6,

  // DB
  COMPOUND_USER_MAX_HEALTH: 1.07,
  COMPOUND_USER_MIN_HEALTH: 0.96,
  AAVE_USER_MAX_HEALTH: "1100000000000000000", // 1.10,
  AAVE_USER_MIN_HEALTH: "950000000000000000", // 0.95,

  MAIN_NET_DEPLOY_MAX_FEE: '24100000000',
  MAIN_NET_DEPLOY_MAX_PRIORITY_FEE: '2100000000',
};
