#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR=$(cd "$(dirname "$0")" && pwd)
SITE_CONFIG=/etc/nginx/sites-available/nextcloud
STAMP=$(date +%Y%m%d-%H%M%S)
SITE_BACKUP="${SITE_CONFIG}.bak-webmars-logging-${STAMP}"

for source_file in nginx-webmars-logging.conf logrotate-webmars webmars-visits.py; do
    if [[ ! -f "${SCRIPT_DIR}/${source_file}" ]]; then
        echo "Missing ${SCRIPT_DIR}/${source_file}" >&2
        exit 1
    fi
done

sudo cp -a "$SITE_CONFIG" "$SITE_BACKUP"
sudo install -d -o www-data -g adm -m 0750 /var/log/nginx/webmars
sudo install -d -o root -g adm -m 0750 /var/log/nginx/webmars/legacy
sudo install -o root -g root -m 0644 \
    "${SCRIPT_DIR}/nginx-webmars-logging.conf" \
    /etc/nginx/conf.d/webmars-logging.conf
sudo install -o root -g root -m 0644 \
    "${SCRIPT_DIR}/logrotate-webmars" \
    /etc/logrotate.d/webmars
sudo install -o root -g root -m 0755 \
    "${SCRIPT_DIR}/webmars-visits.py" \
    /usr/local/bin/webmars-visits

if sudo grep -Fq 'access_log /var/log/nginx/webmars_access.log;' "$SITE_CONFIG"; then
    sudo sed -i \
        's#    access_log /var/log/nginx/webmars_access.log;#    access_log /var/log/nginx/webmars/access.json webmars_json;\n    access_log /var/log/nginx/webmars/visits.json webmars_json if=$webmars_is_entry_request;#' \
        "$SITE_CONFIG"
elif ! sudo grep -Fq 'access_log /var/log/nginx/webmars/access.json webmars_json;' "$SITE_CONFIG"; then
    echo "Could not identify the webMARS access_log directive." >&2
    exit 1
fi

if sudo grep -Fq 'error_log  /var/log/nginx/webmars_error.log;' "$SITE_CONFIG"; then
    sudo sed -i \
        's#    error_log  /var/log/nginx/webmars_error.log;#    error_log  /var/log/nginx/webmars/error.log;#' \
        "$SITE_CONFIG"
elif ! sudo grep -Fq 'error_log  /var/log/nginx/webmars/error.log;' "$SITE_CONFIG"; then
    echo "Could not identify the webMARS error_log directive." >&2
    exit 1
fi

if ! sudo /usr/sbin/nginx -t; then
    echo "Nginx validation failed; restoring ${SITE_BACKUP}." >&2
    sudo cp -a "$SITE_BACKUP" "$SITE_CONFIG"
    exit 1
fi

sudo systemctl reload nginx

for current_log in \
    /var/log/nginx/webmars/access.json \
    /var/log/nginx/webmars/visits.json \
    /var/log/nginx/webmars/error.log; do
    if [[ -e "$current_log" ]]; then
        sudo chown www-data:adm "$current_log"
        sudo chmod 0640 "$current_log"
    fi
done

# Preserve all still-available pre-JSON logs outside the global 14-day rotation.
sudo cp -an /var/log/nginx/webmars_access.log* /var/log/nginx/webmars/legacy/ 2>/dev/null || true
sudo cp -an /var/log/nginx/webmars_error.log* /var/log/nginx/webmars/legacy/ 2>/dev/null || true
sudo chown -R root:adm /var/log/nginx/webmars/legacy
sudo chmod -R u=rwX,g=rX,o= /var/log/nginx/webmars/legacy

sudo /usr/sbin/logrotate --debug /etc/logrotate.d/webmars >/dev/null

echo "webMARS structured logging installed."
echo "Nginx backup: ${SITE_BACKUP}"
