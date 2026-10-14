import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { findHousehold } from "./requests";

export type Person = "rose" | "sam";

export type Who = { household: number; person: Person };

type Links = { rose: string | undefined; sam: string | undefined };

const envLinks = (): Links => ({ rose: process.env.ROSE_LINK_TOKEN, sam: process.env.SAM_LINK_TOKEN });

// The env's links are household 1's (D45); every other household is found by a link's hash (D47).
export async function whoIs(token: string, links: Links = envLinks()): Promise<Who | null> {
  if (matches(token, links.rose)) return { household: 1, person: "rose" };
  if (matches(token, links.sam)) return { household: 1, person: "sam" };
  return token ? findHousehold(hashOf(token)) : null;
}

export function newLink(): string {
  return randomBytes(16).toString("base64url");
}

export function hashOf(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function matches(token: string, expected: string | undefined): boolean {
  if (!token || !expected) return false;
  const a = Buffer.from(token);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}
