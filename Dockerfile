FROM node:16.3.0
WORKDIR $HOME/defi-bot
COPY . .
RUN npm install

CMD ["npx", "hardhat", "node", "&&", "npx", "hardhat", "deploy", "&&", "npx", "hardhat", "test"]
# in prod:
# first npx hardhat --network main_alchemy deploy then 
# CMD ["node", "app/main.js"]
# WARNING: hardhat is a dev dependency only and wont be installed in prod