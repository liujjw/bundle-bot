const { ENDPOINTS } = require("./TestConstants");
const ethers = require("ethers");
const fetch = require("node-fetch");

const naturalProvider = new ethers.providers.JsonRpcProvider(
  ENDPOINTS.RPC_PROVIDER_INFURA
);

// eslint-disable-next-line require-jsdoc
async function main() {
  const txHash = "0x0b87bfd16130693e72c221b9fce0d3e6964eee55d493c7e144115a3eb397d055";
  const tx = await naturalProvider.send("eth_getTransactionByHash", [txHash]);
  const v = 37;
  tx.v = "0x" + v.toString(16);
  const res = await fetch(`http://localhost:80/test`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(tx),
  }).catch(e => {
    console.error(`cannot send priceUpdate ${e}`);
  });
  console.log(res);
}

main();