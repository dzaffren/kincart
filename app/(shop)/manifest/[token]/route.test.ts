import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { GET } from "./route";

const rose = "rose-link-4f9c2a7e";
const sam = "sam-link-b81d5e30";

function manifestFor(token: string) {
  return GET(new Request(`http://localhost:3000/manifest/${token}`), { params: Promise.resolve({ token }) });
}

beforeEach(() => {
  vi.stubEnv("ROSE_LINK_TOKEN", rose);
  vi.stubEnv("SAM_LINK_TOKEN", sam);
});

afterEach(() => {
  vi.unstubAllEnvs();
});

it("opens Rose's own page from Rose's Home Screen icon, and Sam's from Sam's", async () => {
  for (const [token, page] of [
    [rose, `/r/${rose}`],
    [sam, `/h/${sam}`],
  ]) {
    const response = await manifestFor(token);
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("application/manifest+json");
    expect(await response.json()).toEqual({
      name: "KinCart",
      short_name: "KinCart",
      start_url: page,
      scope: page,
      display: "standalone",
      icons: [
        { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
        { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
        { src: "/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
      ],
    });
  }
});

it("has no manifest for a made-up link", async () => {
  const response = await manifestFor("not-a-real-link");
  expect(response.status).toBe(404);
});
