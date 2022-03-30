FROM node:16.3.0

WORKDIR $HOME/bot
COPY ./* $HOME/bot/
RUN npm install

CMD ["npx", "hardhat", "node", "&&", "npx", "hardhat", "test"]
# CMD ["node", "scripts/Runner.js"]
# npx hardhat test to test and npx hardhat node for a local node (set a block height to fork and provider endpoint)
# make sure to set .env for dotenv as well as endpoints for prod
