#!/bin/sh
set -eu

BASE_URL="${TOONARR_INTERNAL_BASE_URL:-http://$(hostname):${PORT:-3000}}"
TOKEN="${TOONARR_INTERNAL_SCHEDULER_TOKEN:?TOONARR_INTERNAL_SCHEDULER_TOKEN is required}"
SERIES_INTERVAL_MINUTES="${NAVERRR_REFRESH_INTERVAL_MINUTES:-180}"
SESSION_INTERVAL_SECONDS="${NAVERRR_SESSION_CHECK_INTERVAL_SECONDS:-3600}"
SESSION_INITIAL_DELAY_SECONDS="${NAVERRR_SESSION_INITIAL_DELAY_SECONDS:-10}"

post_internal() {
  path="$1"

  if ! curl -fsS -X POST \
    -H "x-toonarr-internal-token: ${TOKEN}" \
    "${BASE_URL}${path}" >/dev/null; then
    echo "[toonarr-background-scheduler] request failed: ${path}" >&2
  fi
}

wait_for_server() {
  until curl -fsS "${BASE_URL}/api/health" >/dev/null 2>&1; do
    sleep 2
  done
}

series_loop() {
  wait_for_server
  post_internal "/api/internal/scheduler/series"

  while :; do
    sleep "$((SERIES_INTERVAL_MINUTES * 60))"
    post_internal "/api/internal/scheduler/series"
  done
}

session_loop() {
  wait_for_server
  sleep "${SESSION_INITIAL_DELAY_SECONDS}"
  post_internal "/api/internal/scheduler/naver-session"

  while :; do
    sleep "${SESSION_INTERVAL_SECONDS}"
    post_internal "/api/internal/scheduler/naver-session"
  done
}

series_loop &
session_loop &
wait
