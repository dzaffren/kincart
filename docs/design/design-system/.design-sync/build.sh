#!/bin/sh
# Assembles ds-bundle/ for /design-sync. This design system is tokens only and
# not an npm package, so the design-sync converter can't build it; see NOTES.md.
set -eu
cd "$(dirname "$0")/.."

rm -rf ds-bundle
mkdir -p ds-bundle/components
cp -r styles.css tokens guidelines ds-bundle/
cat .design-sync/conventions.md readme.md > ds-bundle/README.md
printf '/* @ds-bundle: {"namespace":"ShopTogether","components":[],"sourceHashes":{},"inlinedExternals":[],"builtBy":"cc-design-sync"} */\n' > ds-bundle/_ds_bundle.js
printf '{"componentCount":0,"shape":"package"}\n' > ds-bundle/.ds-build-meta.json
printf '{"by":"design-sync-cli"}\n' > ds-bundle/_ds_needs_recompile
