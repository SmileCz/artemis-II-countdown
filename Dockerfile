# ===== build stage =====
FROM node:20-alpine3.23 AS build
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci

COPY . .
RUN npm run build

# ===== runtime stage =====
FROM node:20-alpine3.23

# stáhni security fixy z Alpine repozitářů
RUN apk upgrade --no-cache \
 && apk add --no-cache nginx wget \
 && mkdir -p /var/cache/nginx/ll2 \
 && chown -R nginx:nginx /var/cache/nginx

WORKDIR /app

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
COPY --from=build /app/server /app/server
COPY --from=build /app/node_modules /app/node_modules
COPY --from=build /app/package.json /app/package.json
COPY docker-entrypoint.sh /docker-entrypoint.sh

RUN chmod +x /docker-entrypoint.sh

ENV PORT=8787
ENV SQLITE_PATH=/data/artemis-changes.db

EXPOSE 80
HEALTHCHECK --interval=30s --timeout=3s --retries=3 CMD wget -qO- http://127.0.0.1/ > /dev/null || exit 1
CMD ["/docker-entrypoint.sh"]
