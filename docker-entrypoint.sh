#!/bin/sh
set -eu

mkdir -p /data /var/cache/nginx/ll2 /run/nginx

node /app/server/index.js &

exec nginx -g "pid /run/nginx/nginx.pid; daemon off;"
