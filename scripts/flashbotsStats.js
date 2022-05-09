const {
  FlashbotsBundleProvider,
} = require("@flashbots/ethers-provider-bundle");
const { ENDPOINTS } = require("../lib/Constants");
const ethers = require("ethers");
require("dotenv").config({ path: __dirname + "/../.env" });

const provider =
  new ethers.providers.JsonRpcProvider(ENDPOINTS.ALCHEMY);
const signerWithProvider = new ethers.Wallet(process.env.MM0A_PK, provider);
const flashbotsAuthSigner = new ethers.Wallet(process.env.MM0A2_PK);

/**
 * 
 */
async function main() {
  const flashbotsProvider = await FlashbotsBundleProvider.create(
    signerWithProvider.provider,
    flashbotsAuthSigner);
  console.log(await flashbotsProvider.getUserStats());
  // console.log('<bundleHash>');
}

main().then();