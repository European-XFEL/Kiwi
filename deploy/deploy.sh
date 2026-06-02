#!/bin/bash
# Build the kiwi application.
#
# NOTE: for the staging and production environments, the "yarn build"
# has to be replaced with a command that downloads a ".tar.gz" Kiwi
# bundle and expands it into the path configured in the Dockerfile.
cd ..
yarn build
cd deploy
# Build the nginx docker image that will run kiwi. This assumes the
# files of the Kiwi build will be available on the path that gets
# mapped to the image's "/usr/share/nginx/html" directory by the
# Dockerfile.
docker build -t kiwi-app .
# Runs kiwi at http://localhost:8058
docker run --name kiwi-app -d -v ../dist:/usr/share/nginx/html:ro -p 8058:80 kiwi-app
