FROM ghcr.io/pnpm/pnpm:11 AS base
RUN pnpm runtime set node 24 -g
WORKDIR /app
COPY package.json pnpm-lock.yaml ./

FROM base AS prod-deps
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --prod --frozen-lockfile

FROM base as dev-deps
COPY .  ./
RUN pnpm i

FROM base AS build
COPY tsconfig.json ./
COPY src ./src
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile
RUN pnpm run build

FROM dev-deps AS dev
CMD ["pnpm", "start"]

FROM base AS prod
COPY --from=prod-deps /app/node_modules /app/node_modules
COPY --from=build /app/dist /app/dist
CMD [ "pnpm", "start:prod" ]