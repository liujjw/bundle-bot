const { getProxyAdminFactory } = require("@openzeppelin/hardhat-upgrades/dist/utils");
const { assert } = require("chai");
const { BigNumber } = require("ethers");
const { task } = require("hardhat/config");

const { ENDPOINTS } = require('./lib/Constants');
const TestConstants = require("./test/TestConstants");

require("@openzeppelin/hardhat-upgrades");
require("@nomiclabs/hardhat-waffle");
require("@nomiclabs/hardhat-ethers");

task("deploy", "", async () => {
  const factory = await ethers.getContractFactory("CompoundV3");
  const bot = await factory.deploy({
    gasLimit: BigNumber.from(3500000)
  });
  let receipt = await bot.deployTransaction.wait();
  assert(receipt.status != 0, "deploy failed");
  console.log(receipt.contractAddress);
});

task("deploy-proxied", "", async () => {
  const bot = await ethers.getContractFactory("CompoundImpl");
  // deploys a proxy for the impl, as well as a proxy admin
  const instance = await upgrades.deployProxy(bot, {
    gasLimit: BigNumber.from(3500000)
  });
  console.log(await instance.deployed());
});

task("proxy-change", "", async () => {
  // UPDATE accept an arg for this address or set manually
  const proxyAddress = '';
  const diffImpl = await ethers.getContractFactory("Aave");
  const upgraded = await upgrades.upgradeProxy(proxyAddress, diffImpl);
  
});

require('dotenv').config();

/**
 * @type import('hardhat/config').HardhatUserConfig
 */
module.exports = {
  solidity: {
    compilers: [
      {
        version: "0.8.0",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200
          }
        }
      },
      {
        version: "0.6.12",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200
          }
        }
      },
    ]
  },
  networks: {
    main_alchemy: {
      url: ENDPOINTS.ALCHEMY
    },
    main_infura: {
      url: ENDPOINTS.INFURA
    },
    ropsten_infura: {
      url: ENDPOINTS.ROPSTEN
    },
    hardhat: {
      forking: {
        blockNumber: TestConstants.FORK_2.blockNumber,
        // blockNumber: TestConstants.FORK_3.blockNumber, 
        url: ENDPOINTS.ALCHEMY
      }
    }
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts"
  },
};