# Swiper Store — Linux build of the standalone Next.js output.
#
# Build for the VPS architecture (not the host architecture):
#   docker build --platform linux/amd64 -t swiperstore:linux-amd64 .
#
# The image is both the deployment artifact check and an optional container
# deploy. The runbook still installs the standalone output on the host.

# syntax=docker/dockerfile:1.7

FROM node:24-bookworm-slim AS deps
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

FROM node:24-bookworm-slim AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Next's standalone copy expects public/ to exist even when it is empty.
RUN mkdir -p public
# Build-time placeholders satisfy env validation. Real values are injected at
# runtime; no secret is baked into the image.
RUN DATABASE_URL=postgres://build:build@127.0.0.1:5432/build \
    ADMIN_EMAIL=build@example.com \
    ADMIN_PASSWORD_HASH=build-placeholder \
    WA_NUMBER=6281234567890 \
    UPLOAD_DIR=/tmp/swiperstore-uploads \
    SITE_URL=https://build.example.com \
    npm run build

FROM node:24-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN groupadd --system --gid 1001 nodejs \
    && useradd --system --uid 1001 --gid nodejs nextjs

COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

# storage/ holds uploads and trash; mount it, do not bake it in.
RUN mkdir -p /app/storage/uploads /app/storage/trash \
    && chown -R nextjs:nodejs /app/storage

USER nextjs
EXPOSE 3000

CMD ["node", "server.js"]
