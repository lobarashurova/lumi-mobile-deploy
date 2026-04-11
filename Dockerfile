FROM node:20-bullseye

WORKDIR /usr/src/app

COPY package.json ./

RUN npm install -g @nestjs/cli @nestjs/common @nestjs/core

RUN npm install

COPY . .

RUN npm run build

EXPOSE 3000

CMD ["node", "dist/src/main"]
