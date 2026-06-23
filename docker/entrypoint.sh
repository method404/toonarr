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

mkdir -p /app/data /app/data/settings /app/storage /app/.next/cache
chown -R "$APP_USER:$APP_GROUP" /app/data /app/storage /app/.next/cache
chmod -R u+rwX /app/data /app/storage /app/.next/cache

if [ "${NAVERRR_ENABLE_BACKGROUND_SCHEDULER:-true}" = "true" ]; then
  if [ -z "${TOONARR_INTERNAL_SCHEDULER_TOKEN:-}" ]; then
    export TOONARR_INTERNAL_SCHEDULER_TOKEN="$(cat /proc/sys/kernel/random/uuid)"
  fi
  export TOONARR_INTERNAL_BASE_URL="http://$(hostname):${PORT:-3000}"
  /usr/local/bin/toonarr-background-scheduler &
fi

exec gosu "$APP_USER:$APP_GROUP" node server.js
