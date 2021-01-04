#!/usr/bin/env bash

CHECK_NGINX_SCHEDULE="*/5 * * * *"
INTERPRETER=$(which bash)
CHECK_SCRIPT="$(pwd)/check-nginx.sh"
CHECK_SCRIPT_CRON_FILE="/etc/cron.d/check_nginx_crontab"

chmod u+x $CHECK_SCRIPT
echo "${CHECK_NGINX_SCHEDULE}   root    ${INTERPRETER} ${CHECK_SCRIPT} > /var/log/nginx/check-nginx.log 2>&1" >> $CHECK_SCRIPT_CRON_FILE
echo "" >> $CHECK_SCRIPT_CRON_FILE
systemctl reload crond.service
echo "Check nginx automatic backup schedule: ${CHECK_NGINX_SCHEDULE}"
echo "Installation done"