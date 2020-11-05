#!/bin/bash
set -eEuo pipefail

function lines_to_dots() { while read trash; do echo -n '.'; done }

KC_POSTGRES_DB=kobotoolbox
KPI_POSTGRES_DB=koboform

KPI_TABLES=(
 spatial_ref_sys
 django_migrations
 django_content_type
 auth_user
 auth_group
 auth_permission
 auth_group_permissions
 auth_user_groups
 auth_user_user_permissions
 constance_config
 django_celery_beat_periodictasks
 django_celery_beat_crontabschedule
 django_celery_beat_intervalschedule
 django_celery_beat_periodictask
 django_celery_beat_solarschedule
 django_admin_log
 authtoken_token
 django_digest_partialdigest
 taggit_tag
 taggit_taggeditem
 kpi_collection
 kpi_asset
 reversion_revision
 reversion_version
 kpi_assetversion
 kpi_importtask
 kpi_authorizedapplication
 kpi_taguid
 kpi_objectpermission
 kpi_assetsnapshot
 kpi_onetimeauthenticationkey
 kpi_usercollectionsubscription
 kpi_exporttask
 kpi_assetfile
 hub_sitewidemessage
 hub_configurationfile
 hub_formbuilderpreference
 hub_extrauserdetail
 hub_perusersetting
 oauth2_provider_application
 django_session
 oauth2_provider_accesstoken
 oauth2_provider_grant
 django_digest_usernonce
 oauth2_provider_refreshtoken
 registration_registrationprofile
 hook_hook
 hook_hooklog
 external_integrations_corsmodel
 help_inappmessage
 help_inappmessagefile
 help_inappmessageuserinteractions
 bossoidc_keycloak
)

kpi_tables_single_quoted_csv=$(echo "${KPI_TABLES[@]}" | sed "s/^/'/;s/ /','/g;s/$/'/")

echo "Creating \`${KPI_POSTGRES_DB}\` with PostGIS extensions..."

psql \
    -X \
    -U "$POSTGRES_USER" \
    -h localhost \
    -d postgres <<EOF
CREATE DATABASE "$KPI_POSTGRES_DB" OWNER "$POSTGRES_USER";
\c "$KPI_POSTGRES_DB"
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS postgis_topology;
CREATE EXTENSION IF NOT EXISTS fuzzystrmatch;
CREATE EXTENSION IF NOT EXISTS postgis_tiger_geocoder;
EOF

echo
echo -e 'Done!'

echo -n "We are now copying KPI tables from \`$KC_POSTGRES_DB\` to \`$KPI_POSTGRES_DB\`"

pg_dump \
    -U ${POSTGRES_USER} \
    -h localhost \
    ${KPI_TABLES[@]/#/-t } \
    -d "$KC_POSTGRES_DB" \
| psql --single-transaction \
    -X \
    -U "$POSTGRES_USER" \
    -h localhost \
    -d "$KPI_POSTGRES_DB" \
| lines_to_dots

echo
echo
echo "The database upgrade finished successfully! Thanks for using KoBoToolbox."