FROM node:24-alpine
WORKDIR /app

RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001 -G nodejs

COPY package*.json ./
RUN npm ci --omit=dev

# Create data directory for hand history
RUN mkdir -p /app/data && chown nodejs:nodejs /app/data
VOLUME /app/data

USER nodejs
COPY --chown=nodejs:nodejs src ./src

ENV PORT=3000 DOMAIN=localhost
EXPOSE 3000

CMD ["node", "src/backend"]
