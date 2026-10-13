# Set the framework and checks by hand when creating a Vercel project from the CLI

**Learned:** 2026-10-13 · **From:** /ship skeleton

`vercel project add` leaves the framework blank, so a Next.js app would build as "Other". `vercel link` also writes a `VERCEL_OIDC_TOKEN` line into `.env.local`, and `vercel integration add` runs `env pull` over `.env.local` unless given `--no-env-pull`.

Deployment Checks have no CLI command, but the REST API takes them: a GitHub Actions job is a check with `source.kind` `git-provider`.

Wrong: `vercel project add kincart` and stop there.

Right:

```
vercel api /v9/projects/kincart -X PATCH -f framework=nextjs
echo '{"name":"test","requires":"none","targets":["production"],"source":{"kind":"git-provider","provider":"github","externalCheckName":"test"}}' \
  | vercel api /v2/projects/kincart/checks -X POST --input -
```
