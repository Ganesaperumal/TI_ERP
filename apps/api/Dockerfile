FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@12.15.0 --activate
WORKDIR /app

FROM base AS builder
COPY . .
RUN pnpm install --frozen-lockfile=false
RUN pnpm --filter @ti-erp/database prisma generate
RUN pnpm --filter @ti-erp/api build

FROM base AS runner
WORKDIR /app
COPY --from=builder /app /app
EXPOSE 4000
CMD ["pnpm", "--filter", "@ti-erp/api", "start:prod"]
