FROM node:22-slim
RUN corepack enable
WORKDIR /app
COPY . .
# The API address is baked into the proxy rewrite at build time.
ARG API_INTERNAL_URL=http://api:4000
ENV API_INTERNAL_URL=$API_INTERNAL_URL NEXT_TELEMETRY_DISABLED=1
RUN pnpm install --frozen-lockfile && pnpm --filter @nexcust/web... build
ENV NODE_ENV=production
USER node
EXPOSE 3000
CMD ["pnpm", "--filter", "@nexcust/web", "start"]
