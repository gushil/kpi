#!/bin/bash
set -e

source /etc/profile

# Helper to run commands as UWSGI_USER if defined, otherwise run directly
run_manage() {
    if [[ -n "${UWSGI_USER}" ]]; then
        gosu "${UWSGI_USER}" python manage.py "$@"
    else
        python manage.py "$@"
    fi
}

# Helper to check whether database table exist
check_table() {
    local table="$1"
    local result
    result=$(run_manage dbshell 2>/dev/null <<EOF
SELECT COUNT(*) FROM information_schema.tables WHERE table_name='${table}';
EOF
)
    echo "${result}" | grep -qE '^ *1$'
}

echo 'KPI initializing…'

cd "${KPI_SRC_DIR}"

if [[ -z "${DATABASE_URL}" ]]; then
    echo "DATABASE_URL must be configured to run this server"
    echo "example: 'DATABASE_URL=postgres://hostname:5432/dbname'"
    exit 1
fi

# Handle Python dependencies BEFORE attempting any `manage.py` commands
KPI_WEB_SERVER="${KPI_WEB_SERVER:-uWSGI}"
if [[ "${KPI_WEB_SERVER,,}" == 'uwsgi' || -n "${KUBERNETES_SERVICE_HOST}" ]]; then
    # `diff` returns exit code 1 if it finds a difference between the files
    if ! diff -q "${KPI_SRC_DIR}/dependencies/pip/requirements.txt" "${TMP_DIR}/pip_dependencies.txt" 2>/dev/null
    then
        echo "Syncing production pip dependencies…"
        pip-sync dependencies/pip/requirements.txt 1>/dev/null
        cp "dependencies/pip/requirements.txt" "${TMP_DIR}/pip_dependencies.txt"
    fi
else
    if ! diff -q "${KPI_SRC_DIR}/dependencies/pip/dev_requirements.txt" "${TMP_DIR}/pip_dependencies.txt" 2>/dev/null
    then
        echo "Syncing development pip dependencies…"
        pip-sync dependencies/pip/dev_requirements.txt 1>/dev/null
        cp "dependencies/pip/dev_requirements.txt" "${TMP_DIR}/pip_dependencies.txt"
    fi
fi

# Add a fake migration entry per app whose table already exists
if check_table "bossoidc_keycloak"; then
    echo "Table bossoidc_keycloak exists — running fake migration for bossoidc2…"
    run_manage migrate bossoidc2 0003_keycloak_usertype --fake --noinput
fi

# Fix schema drift: oauth2_provider 0005 may have been recorded as applied without
# actually creating the `created`/`updated` columns on oauth2_provider_application.
# Adding them here is idempotent (IF NOT EXISTS) and unblocks 0006.
echo 'Repairing oauth2_provider schema drift (if any)...'
# Before running the ALTER TABLE, check the table exists first
if check_table "oauth2_provider_application"; then
    run_manage dbshell <<'EOF'
ALTER TABLE oauth2_provider_application
  ADD COLUMN IF NOT EXISTS created timestamp with time zone NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated timestamp with time zone NOT NULL DEFAULT now();
EOF
fi

echo 'Running migrations...'
run_manage migrate --noinput

echo 'Creating superuser…'
run_manage create_kobo_superuser

if [[ ! -d "${KPI_SRC_DIR}/staticfiles" ]] || ! python "${KPI_SRC_DIR}/docker/check_kpi_prefix_outdated.py"; then
    if [[ "${FRONTEND_DEV_MODE}" == "host" ]]; then
        echo "Dev mode is activated and \`npm\` should be run from host."
        # Create folder to be sure following `rsync` command does not fail
        mkdir -p "${KPI_SRC_DIR}/staticfiles"
    else
        echo "Cleaning old build…"
        rm -rf "${KPI_SRC_DIR}/jsapp/fonts"
        rm -rf "${KPI_SRC_DIR}/jsapp/compiled"

        echo "Syncing \`npm\` packages…"
        if ( ! check-dependencies ); then
            npm install --legacy-peer-deps --quiet > /dev/null 2>&1
        else
            npm run postinstall > /dev/null 2>&1
        fi

        echo "Rebuilding client code…"
        npm run build

        echo "Building static files from live code…"
        run_manage collectstatic --noinput
    fi
fi

echo "Copying static files to nginx volume…"
rsync -aq --no-times --delete --chown=www-data "${KPI_SRC_DIR}/staticfiles/" "${NGINX_STATIC_DIR}/" || true

if [[ ! -d "${KPI_SRC_DIR}/locale" ]] || [[ -z "$(ls -A "${KPI_SRC_DIR}/locale")" ]]; then
    echo "Fetching translations…"
    git submodule init
    git submodule update --remote
    run_manage compilemessages
fi

echo 'KPI initialization completed.'

if [ -z "${KUBERNETES_SERVICE_HOST}" ]; then
    rm -f /etc/profile.d/pydev_debugger.bash.sh
    if [[ -d /srv/pydev_orig && -n "${KPI_PATH_FROM_ECLIPSE_TO_PYTHON_PAIRS}" ]]; then
        echo 'Enabling PyDev remote debugging.'
        "${KPI_SRC_DIR}/docker/setup_pydev.bash"
    fi

    echo 'Cleaning up Celery PIDs…'
    rm -f /tmp/celery*.pid

    if [[ -n "${UWSGI_USER}" && -n "${UWSGI_GROUP}" ]]; then
        echo 'Restore permissions on Celery logs folder'
        chown -R "${UWSGI_USER}:${UWSGI_GROUP}" "${KPI_LOGS_DIR}"  

        # This can take a while when starting a container with lots of media files.
        # Maybe we should add a disclaimer as we do in KoBoCAT to let the users
        # do it themselves
        chown -R "${UWSGI_USER}:${UWSGI_GROUP}" "${KPI_MEDIA_DIR}"
    fi

    exec /usr/bin/runsvdir "${SERVICES_DIR}"
fi
