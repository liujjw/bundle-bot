const { getProxyAdminFactory } = require("@openzeppelin/hardhat-upgrades/dist/utils");
const { assert } = require("chai");
const { BigNumber } = require("ethers");
const { task } = require("hardhat/config");
const shell = require('shelljs');
const { createLogger, format, transports } = require('winston');
require('dotenv').config();

let logger = createLogger({
  level: 'info',
  format: format.combine(
      format.timestamp({
        format: 'YYYY-MM-DD HH:mm:ss'
      }),
      format.errors({ stack: true }),
      format.splat(),
      format.json()
  ),
  defaultMeta: { service: 'hardhat.config.js' },
  transports: [
      new transports.File({ filename: 'error.log', level: 'error'}),
      new transports.File({ filename: 'combined.log' }),
  ],
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(new transports.Console({
    format: format.combine(
      format.colorize(),
      format.simple()
    ),
  }));
}
const { ENDPOINTS } = require('./lib/Constants');
const TestConstants = require("./test/TestConstants");

require("@openzeppelin/hardhat-upgrades");
require("@nomiclabs/hardhat-waffle");
require("@nomiclabs/hardhat-ethers");

task("deploy", "", async () => {
  const factory = await ethers.getContractFactory("CompoundV4");
  const bot = await factory.deploy({
    gasLimit: BigNumber.from(3500000)
  });
  let receipt = await bot.deployTransaction.wait();
  assert(receipt.status != 0, "deploy failed");
  logger.info(`deployed bot at ${receipt.contractAddress}`);
  shell.env["BOT_ADDR"] = `${receipt.contractAddress}}`;
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
      url: ENDPOINTS.ALCHEMY,
      accounts: [process.env.MM0A5_PK]
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