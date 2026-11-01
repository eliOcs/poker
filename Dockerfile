# syntax=docker/dockerfile:1

# The bot engine: a static musl binary from the noregrets fork's release, so
# it needs no libc from this image. Each architecture has its own checksum;
# BuildKit builds only the stage the target needs.
ARG TARGETARCH
ARG ENGINE_RELEASE=https://github.com/eliOcs/noregrets/releases/download/v0.3.1

FROM scratch AS engine-arm64
ARG ENGINE_RELEASE
ADD --checksum=sha256:8cab3b8083ab483f8e91ebb1f5b1b6ae201951d380d772d88366642eec683ca7 \
  ${ENGINE_RELEASE}/noregrets-aarch64-linux-musl /noregrets

FROM scratch AS engine-amd64
ARG ENGINE_RELEASE
ADD --checksum=sha256:522889d870f08a92e813e731bcd401cfcdafbef120fec4e15358074ecad7a007 \
  ${ENGINE_RELEASE}/noregrets-x86_64-linux-musl /noregrets

FROM engine-${TARGETARCH} AS engine

FROM node:24-alpine
WORKDIR /app

RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001 -G nodejs

COPY package*.json ./
RUN npm ci --omit=dev --ignore-scripts

COPY --from=engine --chmod=755 /noregrets /usr/local/bin/noregrets

# Create data directory for hand history
RUN mkdir -p /app/data && chown nodejs:nodejs /app/data
VOLUME /app/data

USER nodejs
COPY --chown=nodejs:nodejs src ./src

ENV PORT=3000 DOMAIN=localhost
EXPOSE 3000

CMD ["node", "src/backend"]
