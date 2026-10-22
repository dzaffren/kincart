import { choose, readNeed, readPhoto, type Need, type PhotoNeed } from "./ai";
import { reasonOf } from "./paypal";
import { searchListings, type Found, type Listing } from "./search";

export type Option = Listing & { what: string; why: string; watch: string };

type Problem = "nothing found" | "over limit";

// thing is what Rose called it, such as "a night light".
export type Group = { thing: string; options: Option[]; problem?: Problem };

type Single = { outcome: "options"; options: Option[] } | { outcome: Problem };

export type Search = Single | { outcome: "basket"; groups: Group[] } | { outcome: "too many" | "nothing in photo" };

// words are what the search was for: Rose's own, or the AI's words for Rose's photos. blank counts
// the photos that showed nothing to buy.
type Searched = { words: string; result: Search; blank?: number };

export type PhotoSearch = { words: string; result: Search; photos: number; blank: number };

// The Channel3 calls a Find sent, whatever they answered, for /status (D81).
export type Sent = { searches: number };

const MOST_THINGS = 5;

// Find never runs without its limit, so it needs ADDRESS_KEY too (D74).
export function searchOn(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY && process.env.CHANNEL3_API_KEY && process.env.ADDRESS_KEY);
}

export async function find(words: string, limitCents: number, sent: Sent = { searches: 0 }): Promise<Search> {
  const { result } = await logged(words, 0, sent, async (reasons) => {
    const { things } = await readNeed(words);
    return { words, result: await searchThings(words, things, limitCents, reasons, sent) };
  });
  return result;
}

// The photos go to the first call only (D66). The things' words, joined, name the search for Rose.
export async function findPhoto(
  words: string,
  limitCents: number,
  jpegs: Buffer[],
  sent: Sent = { searches: 0 },
): Promise<PhotoSearch> {
  const searched = await logged(words, jpegs.length, sent, async (reasons) => {
    const need = await readPhoto(words, jpegs);
    if (!need.things.length) return { words, result: { outcome: "nothing in photo" } };
    // In the order Rose added the photos. sort() is stable, so a list keeps its own order (D71).
    const things = [...need.things].sort((a, b) => Math.min(...a.photos) - Math.min(...b.photos));
    const named = things.map((thing) => thing.words).join(", ");
    return {
      words: named,
      result: await searchThings(named, things, limitCents, reasons, sent),
      blank: blankOf(need, jpegs.length),
    };
  });
  return { words: searched.words, result: searched.result, photos: jpegs.length, blank: searched.blank ?? 0 };
}

// A photo that a thing is in is never blank, and a number past Rose's photos never counts (D69).
function blankOf({ things, blank }: PhotoNeed, photos: number): number {
  const covered = new Set(things.flatMap((thing) => thing.photos));
  const counted = blank.filter((photo) => Number.isInteger(photo) && photo >= 1 && photo <= photos && !covered.has(photo));
  return new Set(counted).size;
}

// A search that fails says nothing found under Rose's own words, and the log line says why.
async function logged(
  words: string,
  photos: number,
  sent: Sent,
  run: (reasons: string[]) => Promise<Searched>,
): Promise<Searched> {
  const started = Date.now();
  const reasons: string[] = [];
  const searched = await run(reasons).catch((error): Searched => {
    reasons.push(reasonOf(error));
    return { words, result: { outcome: "nothing found" } };
  });
  const { result } = searched;
  const photo = photos ? ` photos=${photos} blank=${searched.blank ?? 0}` : "";
  const reason = reasons.length ? ` reason=${reasons.join(",")}` : "";
  console.log(
    `find outcome=${result.outcome.replaceAll(" ", "-")} ${counts(result)} searches=${sent.searches} ms=${Date.now() - started}${photo}${reason}`,
  );
  return searched;
}

async function searchThings(
  words: string,
  things: Need["things"],
  limitCents: number,
  reasons: string[],
  sent: Sent,
): Promise<Search> {
  if (things.length > MOST_THINGS) return { outcome: "too many" };
  if (!things.length) return { outcome: "nothing found" };
  if (things.length === 1) return searchThing(words, things[0].query, limitCents, sent);

  // Every thing searches at once, and one that fails blanks only its own group (D31).
  const groups = await Promise.all(
    things.map(async ({ words: thing, query }): Promise<Group> => {
      const result = await searchThing(thing, query, limitCents, sent).catch((error): Single => {
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

async function searchThing(words: string, query: string, limitCents: number, sent: Sent): Promise<Single> {
  if (!query.trim()) return { outcome: "nothing found" };

  sent.searches += 2;
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
