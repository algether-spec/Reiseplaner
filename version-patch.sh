#!/bin/bash
set -euo pipefail

VERSION=$(node -p "require('./package.json').version")
IFS='.' read -r major minor patch <<< "$VERSION"
patch=$((patch + 1))
NEW_VERSION="$major.$minor.$patch"

echo "$NEW_VERSION" > .gitversion

perl -0pi -e "s/\"version\":\\s*\"[0-9]+\\.[0-9]+\\.[0-9]+\"/\"version\": \"$NEW_VERSION\"/" package.json
perl -0pi -e "s/const APP_VERSION = \"[0-9]+\\.[0-9]+\\.[0-9]+\";/const APP_VERSION = \"$NEW_VERSION\";/" app.js
perl -0pi -e "s/id=\"version-badge\">v[0-9]+\\.[0-9]+\\.[0-9]+</id=\"version-badge\">v$NEW_VERSION</" index.html
perl -0pi -e "s/href=\"style\\.css(?:\\?v=[0-9]+\\.[0-9]+\\.[0-9]+)?\"/href=\"style.css?v=$NEW_VERSION\"/" index.html
perl -0pi -e "s/href=\"manifest\\.json(?:\\?v=[0-9]+\\.[0-9]+\\.[0-9]+)?\"/href=\"manifest.json?v=$NEW_VERSION\"/" index.html
perl -0pi -e "s/src=\"config\\.js(?:\\?v=[0-9]+\\.[0-9]+\\.[0-9]+)?\"/src=\"config.js?v=$NEW_VERSION\"/" index.html
perl -0pi -e "s/src=\"app\\.js(?:\\?v=[0-9]+\\.[0-9]+\\.[0-9]+)?\"/src=\"app.js?v=$NEW_VERSION\"/" index.html
perl -0pi -e "s/register\\(\"service-worker\\.js(?:\\?v=[0-9]+\\.[0-9]+\\.[0-9]+)?\"/register(\"service-worker.js?v=$NEW_VERSION\"/" index.html
perl -0pi -e "s/const CACHE_VERSION = \"v[0-9]+\\.[0-9]+\\.[0-9]+\";/const CACHE_VERSION = \"v$NEW_VERSION\";/" service-worker.js

echo "$NEW_VERSION"
