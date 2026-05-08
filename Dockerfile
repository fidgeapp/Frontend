# ── Stage 1: Install dependencies ────────────────────────────────────────────
FROM node:20-alpine AS deps
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci

# ── Stage 2: Build the Next.js app ───────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app

# Copy deps from previous stage
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build args are baked in at build time for NEXT_PUBLIC_ vars.
# Pass them via Railway's "Build Variables" (not runtime env vars).
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_ETH_WALLET
ARG NEXT_PUBLIC_AD_PROVIDER
ARG NEXT_PUBLIC_ADSENSE_CLIENT
ARG NEXT_PUBLIC_ADSENSE_SLOT
ARG NEXT_PUBLIC_ADSTERRA_SOCIAL_BAR
ARG NEXT_PUBLIC_ADSTERRA_POPUNDER
ARG NEXT_PUBLIC_ADSTERRA_DIRECT_LINK

ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
ENV NEXT_PUBLIC_ETH_WALLET=${NEXT_PUBLIC_ETH_WALLET}
ENV NEXT_PUBLIC_AD_PROVIDER=${NEXT_PUBLIC_AD_PROVIDER}
ENV NEXT_PUBLIC_ADSENSE_CLIENT=${NEXT_PUBLIC_ADSENSE_CLIENT}
ENV NEXT_PUBLIC_ADSENSE_SLOT=${NEXT_PUBLIC_ADSENSE_SLOT}
ENV NEXT_PUBLIC_ADSTERRA_SOCIAL_BAR=${NEXT_PUBLIC_ADSTERRA_SOCIAL_BAR}
ENV NEXT_PUBLIC_ADSTERRA_POPUNDER=${NEXT_PUBLIC_ADSTERRA_POPUNDER}
ENV NEXT_PUBLIC_ADSTERRA_DIRECT_LINK=${NEXT_PUBLIC_ADSTERRA_DIRECT_LINK}

RUN npm run build

# ── Stage 3: Production image ─────────────────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

# Copy only what Next.js needs to run
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# Railway injects PORT at runtime; Next.js standalone server reads it.
ENV PORT=8080
EXPOSE 8080

CMD ["node", "server.js"]
