#!/usr/bin/env bash
# Install the collector; keep activation an explicit deployment setting.
set -euo pipefail
SCRIPT_DIR=$(cd "$(dirname "$0")" && pwd)
sudo install -o root -g root -m 0755 "$SCRIPT_DIR/webmars-metrics.py" /usr/local/bin/webmars-metrics
sudo install -o root -g root -m 0644 "$SCRIPT_DIR/webmars-metrics.service" /etc/systemd/system/webmars-metrics.service
sudo install -o root -g root -m 0644 "$SCRIPT_DIR/nginx-webmars-metrics.conf" /etc/nginx/snippets/webmars-metrics.conf
sudo install -o root -g root -m 0644 "$SCRIPT_DIR/nginx-webmars-metrics-http.conf" /etc/nginx/conf.d/webmars-metrics-http.conf
sudo systemctl daemon-reload
sudo systemctl enable webmars-metrics
sudo systemctl restart webmars-metrics
echo 'Collector installed. Complete activation as documented in docs/usage-metrics.md:'
echo '1. Include /etc/nginx/snippets/webmars-metrics.conf inside the webMARS HTTPS server.'
echo '2. Validate and reload Nginx; confirm the endpoint rejects invalid events.'
echo '3. Deploy the frontend: heartbeat.enabled selects the official hostname automatically.'
echo '4. Verify duration_only_heartbeats in: sudo webmars-metrics --report --days 30'
echo 'Optional richer events remain off unless metrics.enabled is explicitly enabled.'
