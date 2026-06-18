#!/bin/sh
set -eu

APP_USER="${APP_USER:-appuser}"
APP_GROUP="${APP_GROUP:-appgroup}"
PUID="${PUID:-}"
PGID="${PGID:-}"

if [ -n "$PGID" ] && [ "$(getent group "$APP_GROUP" | cut -d: -f3)" != "$PGID" ]; then
  groupmod -o -g "$PGID" "$APP_GROUP"
fi

if [ -n "$PUID" ] && [ "$(id -u "$APP_USER")" != "$PUID" ]; then
  usermod -o -u "$PUID" -g "${PGID:-$(id -g "$APP_USER")}" "$APP_USER"
fi

mkdir -p /app/data /app/data/settings /app/storage
chown -R "$APP_USER:$APP_GROUP" /app/data /app/storage
chmod -R u+rwX /app/data /app/storage

exec gosu "$APP_USER:$APP_GROUP" node server.js
