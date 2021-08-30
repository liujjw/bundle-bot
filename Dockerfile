FROM node:16.3.0

# WORKDIR /code

# ENV PORT 80

# COPY package.json /code/package.json

RUN npm install

# COPY . /code

CMD ["node", "scripts/compound.js"]

# redis install script
# wget http://download.redis.io/redis-stable.tar.gz
# tar xvzf redis-stable.tar.gz
# cd redis-stable
# make