FROM node:20-slim
WORKDIR /usr/src/app
COPY package.json ./
RUN npm install --production
COPY src ./src
CMD ["node", "src/index.js"]
