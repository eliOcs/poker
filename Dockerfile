FROM node:24-alpine
WORKDIR /app

RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001 -G nodejs

COPY package*.json ./
RUN npm ci --omit=dev

USER nodejs
COPY --chown=nodejs:nodejs src ./src

ENV PORT=8443 DOMAIN=localhost
EXPOSE 8443

CMD ["node", "src/backend"]
