FROM node:22-slim
RUN apt-get update && apt-get install -y --no-install-recommends openssl && rm -rf /var/lib/apt/lists/* && corepack enable
WORKDIR /app
COPY . .
RUN pnpm install --frozen-lockfile && pnpm --filter @justiceone/api... build
ENV NODE_ENV=production
USER node
EXPOSE 4000
CMD ["node", "apps/api/dist/main.js"]
