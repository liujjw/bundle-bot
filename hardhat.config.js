const { assert } = require("chai");
const { BigNumber } = require("ethers");
const { task } = require("hardhat/config");
require("dotenv").config();

const { ENDPOINTS, PARAMS } = require("./lib/Constants");
const { FORK_2, TEST_PARAMS } = require("./test/TestConstants");

require("@openzeppelin/hardhat-upgrades");
require("@nomiclabs/hardhat-waffle");
require("@nomiclabs/hardhat-ethers");

task("deploy", "", async () => {
  const factory = await ethers.getContractFactory("CompoundV5");
  const bot = await factory.deploy({
    gasLimit: BigNumber.from(PARAMS.DEPLOY_GAS_LIMIT),
    maxFeePerGas: BigNumber.from(TEST_PARAMS.HIGH_BASEFEE),
    maxPriorityFeePerGas: BigNumber.from("1"),
  });
  const receipt = await bot.deployTransaction.wait();
  assert(receipt.status != 0, "deploy failed");
  console.log(`deployed bot at ${receipt.contractAddress}`);
  // console.log(receipt);
});

/**
 * @type import('hardhat/config').HardhatUserConfig
 */
module.exports = {
  solidity: {
    compilers: [
      {
        version: "0.8.9",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
      {
        version: "0.7.5",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
    ],
  },
  networks: {
    kovan: {
      url: "https://eth-kovan.alchemyapi.io/v2/WR64BFS9HYEIdw3Vxx4Ecx6UqXjyxL9d",
      accounts: [process.env.KOVAN_PK]
    },
    main_alchemy: {
      url: ENDPOINTS.ALCHEMY,
      accounts: [process.env.MM0A_PK],
    },
    main_infura: {
      url: ENDPOINTS.INFURA,
    },
    ropsten_infura: {
      url: ENDPOINTS.ROPSTEN,
    },
    hardhat: {
      forking: {
        blockNumber: Number.parseInt(
          process.env.FORK_BLOCKNUMBER ?? FORK_2.blockNumPrev + 10
        ),
        url: ENDPOINTS.ALCHEMY,
        enabled: true,
        // initialDate: new Date()
      },
    },
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
  },
};
