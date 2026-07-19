#!/bin/bash
# Nightly trigger for the capture enrichment pipeline. Fired by launchd
# (see scripts/launchd/com.focusos.capture-enrichment.plist) against the
# local FocusOS server, which is the only place with real filesystem
# access to the Obsidian vault.
set -euo pipefail
cd "$(dirname "$0")/.."
set -a
source .env.local
set +a

: "${CRON_SECRET:?CRON_SECRET is not set in .env.local}"
base_url="${NEXT_PUBLIC_APP_URL:-http://localhost:3000}"

response_file="$(mktemp)"
status_code="$(
  curl --silent --show-error \
    --request GET \
    --header "Authorization: Bearer $CRON_SECRET" \
    --output "$response_file" \
    --write-out "%{http_code}" \
    "$base_url/api/captures/enrich"
)"

echo "HTTP $status_code"
cat "$response_file"
rm -f "$response_file"

if [ "$status_code" -lt 200 ] || [ "$status_code" -ge 300 ]; then
  exit 1
fi
