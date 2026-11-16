#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

mkdir -p dist

output="dist/bob-plugin-ai-translate.bobplugin"
rm -f "$output"
zip -r "$output" info.json main.js prompts \
    -x "*.DS_Store" >/dev/null

unzip -l "$output"
echo
shasum -a 256 "$output"
