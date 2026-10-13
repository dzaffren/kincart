# design-sync notes

- Tokens only, and not an npm package, so the converter can't build it. Don't run `package-build.mjs` or `resync.mjs`. Build with `.design-sync/build.sh`, then `node .ds-sync/package-validate.mjs ./ds-bundle`.
- Stage `.ds-sync/` per the skill, but only `playwright@1.64.0` is needed there. It matches the repo's pin and the cached `chromium-1248`.
- `build.sh` writes `README.md` as `conventions.md` followed by `readme.md`. `readmeHeader` in config records that; the converter isn't what applies it.
- No `_ds_sync.json`: the driver can't diff an off-script layout. Every sync is a full upload, and deletes come from reviewing `list_files`.
- Validate's render check only looks under `components/`, which is empty. The guideline pages and the README example were checked by screenshot in light and dark: tokens resolve and Atkinson Hyperlegible Next loads.

## Known render warns

- `_ds_sync.json absent`: expected, see above.

## Re-sync risks

- The font loads from Google Fonts at runtime (`tokens/fonts.css`). If that's blocked, designs fall back to `system-ui`.
- `readme.md` links to `../system-brief.md` and mentions `DECISIONS.md`. Neither is uploaded.
- Once real React components exist, switch to the converter's package shape. That's a shape change, so the project gets a full re-verify and the old files need a reviewed delete.
