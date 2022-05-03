FROM node:16.3.0
WORKDIR $HOME/defi-bot
COPY package.json .
COPY lib .
COPY app .

CMD ["echo", "remember to seed .env file", "&&", "npm", "install", "&&" ,"node", "app/main.js"]