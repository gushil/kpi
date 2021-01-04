#!/usr/bin/env bash

CHECK_SCRIPT_CRON_FILE="/etc/cron.d/check_nginx_crontab"

rm -f $CHECK_SCRIPT_CRON_FILE
echo "Check nginx crom file ${CHECK_SCRIPT_CRON_FILE} removed"
systemctl reload crond.service
echo "Uninstall done"