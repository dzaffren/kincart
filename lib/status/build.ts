export function buildLabel(sha = process.env.VERCEL_GIT_COMMIT_SHA): string {
  return sha ? sha.slice(0, 7) : "local";
}
