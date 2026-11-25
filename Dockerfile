FROM ghcr.io/pnpm/pnpm:11 AS base

RUN pnpm runtime set node 24 -g
ENV PNPM_HOME="/pnpm"
ENV PATH="${PNPM_HOME}/bin:${PNPM_HOME}:${PATH}"

RUN pnpm add -g --allow-build=@infisical/cli @infisical/cli
RUN target="$(sed -n 's/^# cmd-shim-target=//p' "$(command -v infisical)")" \
    && test -n "$target" \
    && cp -L "$target" /tmp/infisical \
    && /tmp/infisical --version

WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

FROM base AS prod-deps
COPY tsconfig.json tsconfig.build.json ./
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --prod --frozen-lockfile

FROM base AS dev-deps
COPY tsconfig.json tsconfig.build.json ./
RUN pnpm i
COPY .  .
RUN pnpm build

FROM base AS build

COPY tsconfig.json tsconfig.build.json nest-cli.json ./
COPY src ./src

RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install --frozen-lockfile

RUN --mount=type=secret,id=build_demo_secret \
    if [ -f /run/secrets/build_demo_secret ]; then \
      test -s /run/secrets/build_demo_secret && \
      echo "Build secret provided and non-empty"; \
    else \
      echo "Build secret not provided; skipping demo"; \
    fi

RUN pnpm build

FROM dev-deps AS dev
CMD ["sh", "-c", "exec infisical run --projectId=\"$INFISICAL_PROJECT_ID\" --env=dev -- pnpm start:dev"]
HEALTHCHECK --interval=5s --timeout=3s \
    CMD node dist/utils/api-health-check.js || exit 1

FROM gcr.io/distroless/nodejs24-debian13:nonroot AS prod
WORKDIR /app
ENV NODE_ENV=production
COPY --from=prod-deps --chown=nonroot:nonroot /app/node_modules ./node_modules
COPY --from=prod-deps --chown=nonroot:nonroot /app/package.json ./package.json
COPY --from=build --chown=nonroot:nonroot /app/dist ./dist
COPY --from=base --chmod=755 /tmp/infisical /usr/local/bin/infisical

USER nonroot:nonroot

HEALTHCHECK --interval=5s --timeout=3s \
  CMD ["/nodejs/bin/node", "/app/dist/utils/api-health-check.js"]

ENTRYPOINT ["/usr/local/bin/infisical"]
CMD ["run", "--env=prod", "--", "/nodejs/bin/node", "/app/dist/main.js"]
