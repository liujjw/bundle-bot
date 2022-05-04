FROM node:16.3.0
WORKDIR $HOME
COPY package.json .
COPY lib ./lib
COPY app ./app

RUN npm install --production

CMD ["node", "app/main.js"]