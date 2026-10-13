import { timingSafeEqual } from "node:crypto";

export type Person = "rose" | "sam";

type Links = { rose: string | undefined; sam: string | undefined };

const envLinks = (): Links => ({ rose: process.env.ROSE_LINK_TOKEN, sam: process.env.SAM_LINK_TOKEN });

export function whoIs(token: string, links: Links = envLinks()): Person | null {
  if (matches(token, links.rose)) return "rose";
  if (matches(token, links.sam)) return "sam";
  return null;
}

function matches(token: string, expected: string | undefined): boolean {
  if (!token || !expected) return false;
  const a = Buffer.from(token);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}
