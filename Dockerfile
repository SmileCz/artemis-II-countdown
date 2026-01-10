# ===== build stage =====
FROM node:20-alpine3.23 AS build
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci

COPY . .
RUN npm run build

# ===== runtime stage =====
FROM nginx:stable-alpine3.23

# stáhni security fixy z Alpine repozitářů
RUN apk upgrade --no-cache \
 && mkdir -p /var/cache/nginx/ll2 \
 && chown -R nginx:nginx /var/cache/nginx

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80
HEALTHCHECK --interval=30s --timeout=3s --retries=3 CMD wget -qO- http://127.0.0.1/ > /dev/null || exit 1
CMD ["nginx", "-g", "daemon off;"]
