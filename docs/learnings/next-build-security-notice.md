# Run next build again when it stops on a security notice

**Learned:** 2026-10-23 · **From:** /build ask-again · **Updated:** 2026-10-23 by /review ask-again

On Next 16.4.0, `pnpm build` failed with `SecurityFatalError: Your version of Next.js is affected by a known security vulnerability`. It stops to show an upgrade advice, and the same command passes when it runs again. In /build and /review ask-again it stopped every second build. The e2e's web server then failed to start, with only "Process from config.webServer was not able to start".

Wrong: reading the e2e failure as a broken build, or running the upgrade it names in the middle of a slice.

Right: run the e2e again. Tell the user about the upgrade advice, and let them decide on the Next.js upgrade apart from the slice.
