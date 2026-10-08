#!/bin/sh
# Builds the single-file game. page.html is the artifact body; yakuman.html is the standalone file; docs/index.html is what GitHub Pages serves.
cd "$(dirname "$0")"
{ cat src/head.html src/body.html; echo '<script>'; cat src/data.js src/engine.js src/game.js; echo '</script>'; } > page.html
{ echo '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">'; cat src/head.html; echo '</head><body>'; cat src/body.html; echo '<script>'; cat src/data.js src/engine.js src/game.js; echo '</script></body></html>'; } > yakuman.html
cp yakuman.html docs/index.html
echo "built: $(wc -c < yakuman.html) bytes"
