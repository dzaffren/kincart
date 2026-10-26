import { headers } from "next/headers";

// The site's own address, as Vercel's proxy forwards it, for links that leave the page.
export async function origin(): Promise<string> {
  const head = await headers();
  return `${head.get("x-forwarded-proto") ?? "http"}://${head.get("x-forwarded-host") ?? head.get("host")}`;
}
