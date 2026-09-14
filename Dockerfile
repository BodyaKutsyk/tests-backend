FROM ghcr.io/pnpm/pnpm:11 AS base
RUN pnpm runtime set node 24 -g
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

FROM base AS prod-deps
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --prod --frozen-lockfile

FROM base AS dev-deps
RUN pnpm i
COPY .  .

FROM base AS build
COPY tsconfig.json tsconfig.build.json ./
COPY src ./src
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile
RUN pnpm build

FROM dev-deps AS dev
CMD ["pnpm", "start"]
HEALTHCHECK --interval=5s --timeout=3s \
    CMD node src/utils/api-health-check.ts || exit 1

FROM prod-deps AS prod
COPY --from=build /app/dist /app/dist
CMD [ "pnpm", "start:prod" ]
HEALTHCHECK --interval=5s --timeout=3s \
    CMD node dist/utils/api-health-check.js || exit 1