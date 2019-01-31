FROM node:8

WORKDIR /app

COPY package*.json ./
COPY webpack.config.js ./

RUN npm install

CMD ["npm", "start"]
