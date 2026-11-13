FROM node:24-alpine
RUN apk add --no-cache openssl
WORKDIR /app
COPY package.json package-lock.json ./
COPY api ./api
COPY web/package.json ./web/
RUN npm ci --workspace=api --include-workspace-root
EXPOSE 3000
CMD ["node", "api/src/server.js"]