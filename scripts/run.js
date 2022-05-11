const shell = require("shelljs");
const { ENDPOINTS } = require("../lib/Constants");

shell.exec(
  `REDIS_ENDPOINT=http://localhost:6379/ \
  REDIS_HOST=localhost \
  REDIS_PORT=6379 \
  PROVIDER_ENDPOINT=${ENDPOINTS.ALCHEMY}\
  RUNNER_ENDPOINT=http://localhost:8082 \
  RUNNER_PORT=8082 \
  BULL_BOARD_PORT=8083\
  NODE_ENV=production \
  IPC_PROVIDER_ENDPOINT=/d/ethereum/.ethereum/geth.ipc \
  WS_PROVIDER_ENDPOINT=ws://localhost:8546 \
  DB_NUMBER_FOR_JOBS=15 \
  DB_NUMBER_FOR_DATA=14 \
  NUM_WORKERS=5 \
  DB_READY=true \
  MM0A_PK=0xf3ef6376028ba6fe52971e2b969ffce249a4da534d22f6e24188d9c7ca5adb9d\
  MM0A2_PK=0xf3ef6376028ba6fe52971e2b969ffce249a4da534d22f6e24188d9c7ca5adb9d\
  BOT_ADDR=0xEF43AE625f4e375C5035259f41136665fba97F38\
  node app/main.js`);