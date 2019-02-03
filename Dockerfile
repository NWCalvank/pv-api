FROM node:8

WORKDIR /app

COPY package*.json ./
COPY webpack.config.js ./
COPY index.js ./
COPY .env ./

RUN npm ci

EXPOSE 8080

CMD ["npm", "start"]
