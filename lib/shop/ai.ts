import type { Found } from "./search";

export type Need = { things: { words: string; query: string }[] };
// photos and blank are the numbers of Rose's photos, from 1.
export type PhotoNeed = { things: { words: string; query: string; photos: number[] }[]; blank: number[] };
export type Pick = { id: string; what: string; why: string; watch: string };
export type Choice = { picks: Pick[]; aboveLimit: boolean };

const MODEL = "claude-haiku-5-5";

const NEED = `You read what an older person typed into a shopping box. List every product they want to buy, in the order they gave. For each, copy their own words for it exactly, such as "a night light", and write a short shop search query that keeps the sizes, colours and other must-haves they gave. Something sold as one product, such as salt and pepper shakers, is one thing. If they typed nothing to buy, return an empty list.`;

// Photos have a prompt of their own, so the typed path's prompt stays as tested (D66). One call reads
// every photo, so two photos of one pack make one thing (D71).
const NEED_PHOTO = `You read photos that an older person took to show what they want to buy, labelled Photo 1, Photo 2 and so on, and any words they typed with them. A photo of a product shows one product. A photo of a written shopping list shows every product on it, in order. List the products in photo order, and list a product once when two photos show it. For each, list the numbers of the photos it is in, and write a short plain name for it, such as "CR2032 coin battery", with anything their words add to it, such as a size or a count. Their words only add details to products in the photos, so never list a product that only their words name. Then write a short shop search query that keeps the sizes, colours, codes and other must-haves from the photos and their words. In blank, list the number of each photo that shows nothing they could buy.`;

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

const PHOTO_NUMBERS = { type: "array", items: { type: "integer" } };

const NEED_PHOTO_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["things", "blank"],
  properties: {
    things: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["words", "query", "photos"],
        properties: { words: { type: "string" }, query: { type: "string" }, photos: PHOTO_NUMBERS },
      },
    },
    blank: PHOTO_NUMBERS,
  },
};

const CHOOSE = `You help an older person choose something to buy. Each listing under their price limit comes with its photo, if it has one. A listing sells the main thing in its photo, whatever its words say. First leave out every listing that is not the product they asked for: a case, holder, organizer, charger, cable or other part for it, even when its photo shows the product inside it, since the product's own printed retail pack is the only packaging that counts as the product; another size or type than they said; and any listing whose photo shows something other than its name and words say, even when the words fit. Judge a listing with no photo by its name and words alone. Any brand or pack size of the product counts. From the listings left, pick up to three that fit what they asked, best first. Fewer than three is fine, and none if none is left. Never pick a listing that you would describe as only a part, or whose photo shows something else. For each pick write one short, plain sentence each: what it is, why it fits what they asked, and one thing to watch for, such as size, pack count, fit or delivery. Use only what the listing says. Never mention a price or the shop. Refer to listings only by their id. Then say whether any listing above their limit is the thing they asked for.`;

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

// jpegs are Rose's photos as the browser shrank them. The find action checked that each starts like a JPEG.
// Each goes under its own "Photo n:" label, so Haiku can say which photos a thing is in.
export function readPhoto(words: string, jpegs: Buffer[]): Promise<PhotoNeed> {
  const content = [
    ...jpegs.flatMap((jpeg, index) => [
      { type: "text", text: `Photo ${index + 1}:` },
      { type: "image", source: { type: "base64", media_type: "image/jpeg", data: jpeg.toString("base64") } },
    ]),
    { type: "text", text: words ? `They typed: ${words}` : "They typed nothing." },
  ];
  return haiku(NEED_PHOTO, content, NEED_PHOTO_SCHEMA, 2000);
}

// Each listing under the limit goes under its own "Listing <id>:" label, with its photo after it when
// it has one (D92). Listings above the limit stay names only.
export function choose(words: string, under: Found[], above: Found[]): Promise<Choice> {
  const content = [
    { type: "text", text: `They asked: ${JSON.stringify(words)}\n\nUnder their price limit, pick from these:` },
    ...under.flatMap(({ id, name, details, photo }) => [
      { type: "text", text: `Listing ${id}: ${JSON.stringify({ name, details })}` },
      ...(photo ? [{ type: "image", source: { type: "base64", media_type: photo.mediaType, data: photo.data } }] : []),
    ]),
    { type: "text", text: `Above their price limit, not to pick from:\n${JSON.stringify(above.map((listing) => listing.name))}` },
  ];
  return haiku(CHOOSE, content, CHOOSE_SCHEMA, 4000);
}

// Low effort still thinks now and then, and the thinking counts toward max_tokens: a pick that
// thought used about 700 of them, against about 360 without.
async function haiku<T>(system: string, message: string | object[], schema: object, maxTokens: number): Promise<T> {
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
