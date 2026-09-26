FROM ghcr.io/pnpm/pnpm:11 AS base

RUN pnpm runtime set node 24 -g
ENV PNPM_HOME="/pnpm"
ENV PATH="${PNPM_HOME}/bin:${PNPM_HOME}:${PATH}"

RUN pnpm add -g --allow-build=@infisical/cli @infisical/cli
RUN command -v infisical && infisical --version

WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

FROM base AS prod-deps
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --prod --frozen-lockfile

FROM base AS dev-deps
RUN pnpm i
COPY .  .
RUN pnpm build

FROM base AS build
COPY tsconfig.json tsconfig.build.json ./
COPY src ./src
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile
RUN pnpm build

FROM dev-deps AS dev
CMD ["sh", "-c", "exec infisical run --projectId=\"$INFISICAL_PROJECT_ID\" --env=dev -- pnpm start:dev"]
HEALTHCHECK --interval=5s --timeout=3s \
    CMD node src/utils/api-health-check.ts || exit 1

FROM prod-deps AS prod
COPY --from=build /app/dist /app/dist
CMD ["sh", "-c", "exec infisical run --projectId=\"$INFISICAL_PROJECT_ID\" --env=prod -- pnpm start:prod"]
HEALTHCHECK --interval=5s --timeout=3s \
    CMD node dist/utils/api-health-check.js || exit 1