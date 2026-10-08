#!/bin/sh
# Rebuilds the game and pushes the whole project to GitHub (mtp-24/yakuman). Pages serves docs/index.html. Usage: ./publish.sh "message"
cd "$(dirname "$0")" && ./build.sh && git add -A && git commit -q -m "${1:-Update build}" && git push -q && echo "pushed: https://mtp-24.github.io/yakuman/ (live in about a minute)"
