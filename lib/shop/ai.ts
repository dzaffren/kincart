import type { Found } from "./search";

export type Need = { things: { words: string; query: string }[] };
export type Pick = { id: string; what: string; why: string; watch: string };
export type Choice = { picks: Pick[]; aboveLimit: boolean };

const MODEL = "claude-haiku-5-5";

const NEED = `You read what an older person typed into a shopping box. List every product they want to buy, in the order they gave. For each, copy their own words for it exactly, such as "a night light", and write a short shop search query that keeps the sizes, colours and other must-haves they gave. Something sold as one product, such as salt and pepper shakers, is one thing. If they typed nothing to buy, return an empty list.`;

const NEED_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["things"],
  properties: {
    things: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["words", "query"],
        properties: { words: { type: "string" }, query: { type: "string" } },
      },
    },
  },
};

const CHOOSE = `You help an older person choose something to buy. From the listings under their price limit, pick up to three that fit what they asked, best first, or none if none is really the thing they asked for. For each pick write one short, plain sentence each: what it is, why it fits what they asked, and one thing to watch for, such as size, pack count, fit or delivery. Use only what the listing says. Never mention a price or the shop. Refer to listings only by their id. Then say whether any listing above their limit is the thing they asked for.`;

const CHOOSE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["picks", "aboveLimit"],
  properties: {
    picks: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["id", "what", "why", "watch"],
        properties: { id: { type: "string" }, what: { type: "string" }, why: { type: "string" }, watch: { type: "string" } },
      },
    },
    aboveLimit: { type: "boolean" },
  },
};

export function readNeed(words: string): Promise<Need> {
  return haiku(NEED, words, NEED_SCHEMA, 2000);
}

export function choose(words: string, under: Found[], above: Found[]): Promise<Choice> {
  const listings = under.map(({ id, name, details }) => ({ id, name, details }));
  const message = [
    `They asked: ${JSON.stringify(words)}`,
    `Under their price limit, pick from these:\n${JSON.stringify(listings)}`,
    `Above their price limit, not to pick from:\n${JSON.stringify(above.map((listing) => listing.name))}`,
  ].join("\n\n");
  return haiku(CHOOSE, message, CHOOSE_SCHEMA, 4000);
}

// Low effort still thinks now and then, and the thinking counts toward max_tokens: a pick that
// thought used about 700 of them, against about 360 without.
async function haiku<T>(system: string, message: string, schema: object, maxTokens: number): Promise<T> {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": process.env.ANTHROPIC_API_KEY ?? "",
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: maxTokens,
      system,
      messages: [{ role: "user", content: message }],
      output_config: { effort: "low", format: { type: "json_schema", schema } },
    }),
    cache: "no-store",
    signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) throw new Error(`anthropic ${response.status}`);
  const body: { content?: { type: string; text?: string }[]; stop_reason?: string } = await response.json();
  const text = body.content?.find((block) => block.type === "text")?.text;
  if (!text || body.stop_reason === "max_tokens") throw new Error(`anthropic ${body.stop_reason ?? "no text"}`);
  return JSON.parse(text);
}
