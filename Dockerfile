FROM node:16.3.0

WORKDIR $HOME/bot
# ENV PORT 80
COPY ./* $HOME/bot/

RUN npm install

CMD ["node", "scripts/compound.js"]
