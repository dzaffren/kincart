import { choose, readNeed, readPhoto, type Need } from "./ai";
import { reasonOf } from "./paypal";
import { searchListings, type Found, type Listing } from "./search";

export type Option = Listing & { what: string; why: string; watch: string };

type Problem = "nothing found" | "over limit";

// thing is what Rose called it, such as "a night light".
export type Group = { thing: string; options: Option[]; problem?: Problem };

type Single = { outcome: "options"; options: Option[] } | { outcome: Problem };

export type Search = Single | { outcome: "basket"; groups: Group[] } | { outcome: "too many" | "nothing in photo" };

// words are what the search was for: Rose's own, or the AI's words for Rose's photo.
type Searched = { words: string; result: Search };

const MOST_THINGS = 5;

export function searchOn(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY && process.env.CHANNEL3_API_KEY);
}

export async function find(words: string, limitCents: number): Promise<Search> {
  const { result } = await logged(words, "", async (reasons) => {
    const { things } = await readNeed(words);
    return { words, result: await searchThings(words, things, limitCents, reasons) };
  });
  return result;
}

// The photo goes to the first call only (D66). The things' words, joined, name the search for Rose.
export function findPhoto(words: string, limitCents: number, jpeg: Buffer): Promise<Searched> {
  return logged(words, " photo=yes", async (reasons) => {
    const { things } = await readPhoto(words, jpeg);
    if (!things.length) return { words, result: { outcome: "nothing in photo" } };
    const named = things.map((thing) => thing.words).join(", ");
    return { words: named, result: await searchThings(named, things, limitCents, reasons) };
  });
}

// A search that fails says nothing found under Rose's own words, and the log line says why.
async function logged(words: string, photo: string, run: (reasons: string[]) => Promise<Searched>): Promise<Searched> {
  const started = Date.now();
  const reasons: string[] = [];
  const searched = await run(reasons).catch((error): Searched => {
    reasons.push(reasonOf(error));
    return { words, result: { outcome: "nothing found" } };
  });
  const { result } = searched;
  const reason = reasons.length ? ` reason=${reasons.join(",")}` : "";
  console.log(
    `find outcome=${result.outcome.replaceAll(" ", "-")} ${counts(result)} ms=${Date.now() - started}${photo}${reason}`,
  );
  return searched;
}

async function searchThings(words: string, things: Need["things"], limitCents: number, reasons: string[]): Promise<Search> {
  if (things.length > MOST_THINGS) return { outcome: "too many" };
  if (!things.length) return { outcome: "nothing found" };
  if (things.length === 1) return searchThing(words, things[0].query, limitCents);

  // Every thing searches at once, and one that fails blanks only its own group (D31).
  const groups = await Promise.all(
    things.map(async ({ words: thing, query }): Promise<Group> => {
      const result = await searchThing(thing, query, limitCents).catch((error): Single => {
        reasons.push(reasonOf(error));
        return { outcome: "nothing found" };
      });
      return result.outcome === "options"
        ? { thing, options: result.options }
        : { thing, options: [], problem: result.outcome };
    }),
  );
  return groups.some((group) => group.options.length) ? { outcome: "basket", groups } : { outcome: "nothing found" };
}

async function searchThing(words: string, query: string, limitCents: number): Promise<Single> {
  if (!query.trim()) return { outcome: "nothing found" };

  const [under, all] = await Promise.all([searchListings(query, limitCents), searchListings(query)]);
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

function counts(result: Search): string {
  if (result.outcome !== "basket") return `listings=${result.outcome === "options" ? result.options.length : 0}`;
  const shown = result.groups.filter((group) => group.options.length);
  const listings = shown.reduce((sum, group) => sum + group.options.length, 0);
  return `things=${result.groups.length} shown=${shown.length} listings=${listings}`;
}

function listingOf({ id, name, cents, shop, url, imageUrl }: Found): Listing {
  return { id, name, cents, shop, url, imageUrl };
}
