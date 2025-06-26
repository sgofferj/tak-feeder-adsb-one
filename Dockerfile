FROM node:20-alpine

WORKDIR /usr/src/app/
COPY package.json .
RUN npm install
COPY index.js .
ADD lib lib

CMD [ "node", "index.js" ]
