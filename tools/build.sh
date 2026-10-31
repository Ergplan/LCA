#!/usr/bin/env bash
# Assembles the single-file mock: src/ partials + vendor Strata bundle -> index.html
set -euo pipefail
cd "$(dirname "$0")/.."
{
  cat src/head.html src/body.html
  echo "<script>"; cat vendor/strata-charts.min.js; echo "</script>"
  echo "<script>"; cat src/01-data-iso.js src/02-shell-dashboard.js src/03-live-map.js src/04-site-map.js src/05-footprints.js src/06-modules.js; echo "</script>"
  echo "</body></html>"
} > index.html
echo "Built index.html ($(wc -c < index.html) bytes)"
