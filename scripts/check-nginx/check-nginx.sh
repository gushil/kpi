#!/usr/bin/env bash

set -e

NOT_SPV_NGINX_COUNT=$(docker exec -it kobo-docker_nginx_1 ps xao cmd | awk '/^nginx[^:]/' | wc -l)
echo "Not spv nginx count = $NOT_SPV_NGINX_COUNT"

if [ $NOT_SPV_NGINX_COUNT -gt 0 ]; then
    echo "Ready to stop spv nginx processes on $(date)"
    docker exec -it kobo-docker_nginx_1 sv stop nginx
    echo "spv nginx processes stopped on $(date)"
else
    echo "Keep spv nginx processes alive on $(date)"
fi