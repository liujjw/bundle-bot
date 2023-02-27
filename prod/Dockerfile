FROM node:16.3.0

WORKDIR $HOME

CMD ["node", "../scripts/run.js"]

COPY package.json .
RUN npm install --production
# TODO update paths
COPY lib ./lib
COPY app ./app
COPY scripts/run.js ./scripts/run.js
COPY .env ./.env

