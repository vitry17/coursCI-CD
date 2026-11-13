FROM node:20-alpine
RUN apk add --no-cache openssl
WORKDIR /app
COPY package.json package-lock.json ./
COPY api/package.json ./api/
COPY web/package.json ./web/
RUN npm ci --workspace=api --include-workspace-root
COPY api ./api
RUN npm run db:generate --workspace=api
EXPOSE 3000
CMD ["node", "api/src/server.js"]