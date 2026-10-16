FROM node:20-alpine

WORKDIR /app

COPY package.json ./
COPY api/package.json ./api/

RUN npm install --workspace=api --omit=dev

COPY api/src ./api/src

EXPOSE 3000
CMD ["node", "api/src/server.js"]
