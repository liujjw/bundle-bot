const AccountsDbClient = require("../lib/AccountsDbClient");

const db = {
  HOST: "localhost",
  port: "6379"
}

async function main() {
  const store = new AccountsDbClient(db);
  await store.init();
  console.log((await store.getStoredCompoundAccounts(0, 5)).length);
}

main().then();