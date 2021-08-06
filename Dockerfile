FROM node:16.3.0

# WORKDIR /code

# ENV PORT 80

# COPY package.json /code/package.json

RUN npm install

# COPY . /code

CMD ["node", "scripts/compound.js"]