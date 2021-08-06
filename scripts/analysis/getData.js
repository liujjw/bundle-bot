let AuctionBidPricer = require("../../lib/AuctionBidPricer");
let fs = require("fs");

async function main() {
    let pricer = new AuctionBidPricer();
    let data = await pricer.getLastFlashbotsBlocks(10000);
    fs.writeFileSync("data.json", JSON.stringify(data, null, 2));
}

main().then();