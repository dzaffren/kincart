import { choose, readNeed } from "./ai";
import { reasonOf } from "./paypal";
import { searchListings, type Found, type Listing } from "./search";

export type Option = Listing & { what: string; why: string; watch: string };

export type Search =
  | { outcome: "options"; options: Option[] }
  | { outcome: "nothing found" | "over limit" | "several" };

export function searchOn(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY && process.env.CHANNEL3_API_KEY);
}

export async function find(words: string, limitCents: number): Promise<Search> {
  const started = Date.now();
  let reason = "";
  const result = await search(words, limitCents).catch((error): Search => {
    reason = ` reason=${reasonOf(error)}`;
    return { outcome: "nothing found" };
  });
  const count = result.outcome === "options" ? result.options.length : 0;
  console.log(`find outcome=${result.outcome.replace(" ", "-")} listings=${count} ms=${Date.now() - started}${reason}`);
  return result;
}

async function search(words: string, limitCents: number): Promise<Search> {
  const need = await readNeed(words);
  if (need.kind === "list") return { outcome: "several" };
  if (need.kind === "not a product" || !need.query.trim()) return { outcome: "nothing found" };

  const [under, all] = await Promise.all([searchListings(need.query, limitCents), searchListings(need.query)]);
  const affordable = under.filter((listing) => listing.cents <= limitCents);
  const above = all.filter((listing) => listing.cents > limitCents);
  if (!affordable.length && !above.length) return { outcome: "nothing found" };

  const choice = await choose(words, affordable, above);
  const options: Option[] = [];
  for (const { id, what, why, watch } of choice.picks) {
    const found = affordable.find((listing) => listing.id === id);
    if (found && !options.some((option) => option.id === id)) options.push({ ...listingOf(found), what, why, watch });
  }
  if (options.length) return { outcome: "options", options: options.slice(0, 3) };
  return { outcome: choice.aboveLimit ? "over limit" : "nothing found" };
}

function listingOf({ id, name, cents, shop, url, imageUrl }: Found): Listing {
  return { id, name, cents, shop, url, imageUrl };
}
