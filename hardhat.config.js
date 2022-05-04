const {
  getProxyAdminFactory,
} = require("@openzeppelin/hardhat-upgrades/dist/utils");
const { assert } = require("chai");
const { BigNumber } = require("ethers");
const { task } = require("hardhat/config");
const shell = require("shelljs");
require("dotenv").config();

const { ENDPOINTS } = require("./lib/Constants");
const TestConstants = require("./test/TestConstants");

require("@openzeppelin/hardhat-upgrades");
require("@nomiclabs/hardhat-waffle");
require("@nomiclabs/hardhat-ethers");

task("deploy", "", async () => {
  const factory = await ethers.getContractFactory("CompoundV5");
  const bot = await factory.deploy({
    gasLimit: BigNumber.from(3500000),
  });
  const receipt = await bot.deployTransaction.wait();
  assert(receipt.status != 0, "deploy failed");
  console.log(`deployed bot at ${receipt.contractAddress}`);
  // shell.env["BOT_ADDR"] = `${receipt.contractAddress}}`;
});

task("deploy-proxied", "", async () => {
  const bot = await ethers.getContractFactory("CompoundImpl");
  // deploys a proxy for the impl, as well as a proxy admin
  const instance = await upgrades.deployProxy(bot, {
    gasLimit: BigNumber.from(3500000),
  });
  console.log(await instance.deployed());
});

task("proxy-change", "", async () => {
  // TODO accept an arg for this address or set manually
  const proxyAddress = "";
  const diffImpl = await ethers.getContractFactory("Aave");
  const upgraded = await upgrades.upgradeProxy(proxyAddress, diffImpl);
});

/**
 * @type import('hardhat/config').HardhatUserConfig
 */
module.exports = {
  solidity: {
    compilers: [
      {
        version: "0.8.13",
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
      accounts: [process.env.MM0A5_PK],
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
          process.env.FORK_BLOCKNUMBER ?? TestConstants.FORKS.blockNum2Prev + 10
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
