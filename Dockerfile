FROM oven/bun:1 AS builder
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile
COPY . .
RUN bun run build

FROM oven/bun:1 AS prod-deps
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile --production

FROM oven/bun:1-slim AS runtime
WORKDIR /app
COPY --from=builder /app/build ./build
COPY --from=builder /app/bin ./bin
COPY --from=builder /app/drizzle ./drizzle
COPY --from=builder /app/package.json ./
COPY --from=prod-deps /app/node_modules ./node_modules

ENV DOCKER=1
# Security: HOST defaults to 127.0.0.1. The CLI at bin/cli.ts enforces
# that only 127.0.0.1 and ::1 are allowed, preventing network exposure.
# docker-compose.yml handles port mapping to make the container reachable.
ENV HOST=127.0.0.1
ENV PORT=3000

RUN mkdir -p /data && chown bun:bun /data

USER bun
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s \
  CMD bun -e "fetch('http://127.0.0.1:3000/').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"

CMD ["bun", "run", "bin/cli.ts"]
