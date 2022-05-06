const { ethers, upgrades } = require("hardhat"); 
const { PARAMS } = require("../lib/Constants");
const { BigNumber } = require("ethers");
const hre = require("hardhat");

/**
 * 
 */
async function deploy() {
  const bot = await ethers.getContractFactory("CompoundV5Proxied");
  const instance = await upgrades.deployProxy(bot, {
    gasLimit: BigNumber.from(PARAMS.DEPLOY_GAS_LIMIT)
  });
  const deployed = await instance.deployed();
  console.log(`address: ${deployed.address}`);
  // console.log(`owner: ${await deployed.OWNER()}`);
}

/**
 * 
 * @param {string} address 
 */
async function upgrade(address) {
  const bot = await ethers.getContractFactory("CompoundV5Proxied");
  const upgraded = await upgrades.upgradeProxy(address, bot);
  console.log(upgraded);
}

/**
 * 
 */
async function main() {
  await deploy();
}

main().catch(e => console.error(e));
