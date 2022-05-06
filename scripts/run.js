const shell = require("shelljs");

shell.exec(
  `REDIS_ENDPOINT=http://localhost:6379/ \
  REDIS_HOST=localhost \
  REDIS_PORT=6379 \
  PROVIDER_ENDPOINT=https://mainnet.infura.io/v3/e8b3009ed18d4b3c9a05fdb4bf5f2bc2 \
  RUNNER_ENDPOINT=http://localhost:8080 \
  RUNNER_PORT=8080 \
  NODE_ENV=staging \
  IPC_PROVIDER_ENDPOINT=/d/ethereum/.ethereum/geth.ipc \
  WS_PROVIDER_ENDPOINT=ws://localhost:8546 \
  DB_NUMBER_FOR_JOBS=15 \
  DB_NUMBER_FOR_DATA=14 \
  NUM_WORKERS=5 \
  DB_READY=true \
  node app/main.js`);