// Usage: node scripts/fake-apis.mjs, or RECORD=1 node scripts/fake-apis.mjs
// Stands in for Channel3 and Claude in the e2e, answering each call from e2e/recordings/ (D127).
// A call with no recording answers 500 (D129). With RECORD=1 it goes to the real service with the real key
// from the env, and a good reply is saved.
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import { join } from "node:path";

const services = {
  "/v1/search": { name: "channel3", url: "https://api.trychannel3.com/v1/search" },
  "/v1/messages": { name: "anthropic", url: "https://api.anthropic.com/v1/messages" },
};

// Listing photos come from Channel3's CDN and can change, so a call matches on its text alone. Rose's own
// photos, each after a "Photo n:" label, come from e2e/photos/ and keep a fingerprint, or two Finds of
// photos and no words would look the same.
function withoutPhotos(value) {
  if (Array.isArray(value)) {
    return value.map((inner, index) =>
      inner?.type === "image" && /^Photo \d+:$/.test(value[index - 1]?.text ?? "")
        ? { type: "image", sha: createHash("sha256").update(inner.source?.data ?? "").digest("hex").slice(0, 16) }
        : withoutPhotos(inner),
    );
  }
  if (!value || typeof value !== "object") return value;
  if (value.type === "image") return { type: "image" };
  return Object.fromEntries(Object.entries(value).map(([key, inner]) => [key, withoutPhotos(inner)]));
}

export function keyOf(service, body) {
  return createHash("sha256")
    .update(`${service} ${JSON.stringify(withoutPhotos(body))}`)
    .digest("hex")
    .slice(0, 16);
}

function named(service, body) {
  if (service === "channel3") return `${body.query}${body.filters ? ` under ${body.filters.price?.max_price}` : ""}`;
  const texts = body.messages?.flatMap((m) => (typeof m.content === "string" ? [m.content] : m.content.map((c) => c.text ?? "<image>")));
  return `${body.system?.slice(0, 60)} | ${texts?.join(" ").slice(0, 200)}`;
}

async function real(service, url, body) {
  const headers =
    service === "channel3"
      ? { "x-api-key": process.env.CHANNEL3_API_KEY ?? "" }
      : { "x-api-key": process.env.ANTHROPIC_API_KEY ?? "", "anthropic-version": "2023-06-01" };
  const response = await fetch(url, {
    method: "POST",
    headers: { ...headers, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return { status: response.status, reply: await response.json().catch(() => ({})) };
}

export function serve(dir, record = false) {
  return createServer(async (request, response) => {
    const send = (status, reply) => {
      response.writeHead(status, { "content-type": "application/json" });
      response.end(JSON.stringify(reply));
    };
    const service = services[request.url ?? ""];
    if (request.method !== "POST" || !service) return send(404, { error: "not a recorded API" });

    const chunks = [];
    for await (const chunk of request) chunks.push(chunk);
    const body = JSON.parse(Buffer.concat(chunks).toString() || "{}");
    const file = join(dir, `${service.name}-${keyOf(service.name, body)}.json`);

    const saved = await readFile(file, "utf8").catch(() => undefined);
    if (saved) return send(200, JSON.parse(saved).reply);
    if (!record) {
      console.error(`no recording: ${service.name} ${named(service.name, body)}`);
      return send(500, { error: "no recording" });
    }

    const { status, reply } = await real(service.name, service.url, body);
    if (status === 200) {
      await mkdir(dir, { recursive: true });
      await writeFile(file, `${JSON.stringify({ request: withoutPhotos(body), reply }, null, 2)}\n`);
      console.error(`recorded: ${service.name} ${named(service.name, body)}`);
    } else {
      console.error(`not recorded: ${service.name} ${status} ${named(service.name, body)}`);
    }
    send(status, reply);
  });
}

if (import.meta.filename === process.argv[1]) {
  const dir = new URL("../e2e/recordings/", import.meta.url).pathname;
  serve(dir, process.env.RECORD === "1").listen(3999, "localhost");
}
