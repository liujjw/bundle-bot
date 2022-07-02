const shell = require("shelljs");
const { ENDPOINTS } = require("../lib/Constants");

shell.exec(
  `REDIS_ENDPOINT=http://localhost:6379/ \
  REDIS_HOST=localhost \
  REDIS_PORT=6379 \
  PROVIDER_ENDPOINT=${ENDPOINTS.ALCHEMY}\
  WS_PROVIDER_ENDPOINT=http://localhost:8556\
  RUNNER_ENDPOINT=http://localhost:8082 \
  RUNNER_PORT=8082 \
  BULL_BOARD_PORT=8083\
  NODE_ENV=production\
  IPC_PROVIDER_ENDPOINT=/d/ethereum/.ethereum/geth.ipc \
  DB_NUMBER_FOR_JOBS=15 \
  DB_NUMBER_FOR_DATA=14 \
  NUM_WORKERS=2 \
  DB_READY=true \
  BOT_ADDR=0xEF43AE625f4e375C5035259f41136665fba97F38\
  REVERSE_PROXY_PORT=80\
  node app/main.js`);