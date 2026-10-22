import { choose, otherWords, readNeed, readPhoto, type Need, type PhotoNeed } from "./ai";
import { reasonOf } from "./paypal";
import { searchListings, withPhotos, type Found, type Listing } from "./search";

export type Option = Listing & { what: string; why: string; watch: string };

type Problem = "nothing found" | "over limit";

// thing is what Rose called it, such as "a night light". query is the shop search it last ran, which
// Find another avoids, and tried marks a group that Find another searched.
export type Group = { thing: string; options: Option[]; problem?: Problem; query?: string; tried?: boolean };

type Single = ({ outcome: "options"; options: Option[] } | { outcome: Problem }) & { query?: string };

export type Search = Single | { outcome: "basket"; groups: Group[] } | { outcome: "too many" | "nothing in photo" };

// words are what the search was for: Rose's own, or the AI's words for Rose's photos. blank counts
// the photos that showed nothing to buy.
type Searched = { words: string; result: Search; blank?: number };

export type PhotoSearch = { words: string; result: Search; photos: number; blank: number };

// A thing that Find another searches again: what Rose called it, the query that gave Rose nothing to use,
// and the listing ids Sam refused (D98).
export type Again = { words: string; query: string; refused: string[] };

// searches are the Channel3 calls a Find sent, whatever they answered, for /status (D81). checked are the
// listings sent to Haiku with a photo, and unloaded the listings dropped for their photo. Those two are for the log.
export type Sent = { searches: number; checked: number; unloaded: number };

const MOST_THINGS = 5;

// Find never runs without its limit, so it needs ADDRESS_KEY too (D74).
export function searchOn(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY && process.env.CHANNEL3_API_KEY && process.env.ADDRESS_KEY);
}

export async function find(words: string, limitCents: number, sent: Sent = { searches: 0, checked: 0, unloaded: 0 }): Promise<Search> {
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
  sent: Sent = { searches: 0, checked: 0, unloaded: 0 },
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

// Each thing gets other words in a Haiku call of its own, then Find's searches and pick step without what
// Sam refused (D99). One thing gives a single search, and several a basket whose groups are all tried.
export async function findAgain(
  words: string,
  things: Again[],
  limitCents: number,
  sent: Sent = { searches: 0, checked: 0, unloaded: 0 },
): Promise<Search> {
  const { result } = await logged(
    words,
    0,
    sent,
    async (reasons) => {
      // A thing whose call fails blanks only itself, and keeps its last query (D31).
      const found = await Promise.all(
        things.map(async ({ words: thing, query: last, refused }): Promise<Single> => {
          try {
            const { query } = await otherWords(thing, last);
            return { ...(await searchThing(thing, query, limitCents, sent, refused)), query };
          } catch (error) {
            reasons.push(reasonOf(error));
            return { outcome: "nothing found", query: last };
          }
        }),
      );
      if (things.length === 1) return { words, result: found[0] };
      const groups = things.map(({ words: thing }, index) => ({ ...groupOf(thing, found[index]), tried: true }));
      const shown = groups.some((group) => group.options.length);
      return { words, result: shown ? { outcome: "basket", groups } : { outcome: "nothing found" } };
    },
    true,
  );
  return result;
}

// A one-thing search as one group of a basket, so a basket's groups and Find another's search of one
// group come out alike.
export function groupOf(thing: string, result: Search): Group {
  const query = "query" in result ? result.query : undefined;
  if (result.outcome === "options") return { thing, options: result.options, query };
  return { thing, options: [], problem: result.outcome === "over limit" ? "over limit" : "nothing found", query };
}

// A photo that a thing is in is never blank, and a number past Rose's photos never counts (D69).
function blankOf({ things, blank }: PhotoNeed, photos: number): number {
  const covered = new Set(things.flatMap((thing) => thing.photos));
  const counted = blank.filter((photo) => Number.isInteger(photo) && photo >= 1 && photo <= photos && !covered.has(photo));
  return new Set(counted).size;
}

// A search that fails says nothing found under Rose's own words, and the log line says why. again marks
// a Find another.
async function logged(
  words: string,
  photos: number,
  sent: Sent,
  run: (reasons: string[]) => Promise<Searched>,
  again = false,
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
    `find outcome=${result.outcome.replaceAll(" ", "-")} ${counts(result)} searches=${sent.searches} ms=${Date.now() - started} checked=${sent.checked} unloaded=${sent.unloaded}${photo}${again ? " again=1" : ""}${reason}`,
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
  if (things.length === 1) return { ...(await searchThing(words, things[0].query, limitCents, sent)), query: things[0].query };

  // Every thing searches at once, and one that fails blanks only its own group (D31).
  const groups = await Promise.all(
    things.map(async ({ words: thing, query }): Promise<Group> => {
      const result = await searchThing(thing, query, limitCents, sent).catch((error): Single => {
        reasons.push(reasonOf(error));
        return { outcome: "nothing found" };
      });
      return groupOf(thing, { ...result, query });
    }),
  );
  return groups.some((group) => group.options.length) ? { outcome: "basket", groups } : { outcome: "nothing found" };
}

// refused are listings Sam said no to, which Find another leaves out (D98).
async function searchThing(
  words: string,
  query: string,
  limitCents: number,
  sent: Sent,
  refused: string[] = [],
): Promise<Single> {
  if (!query.trim()) return { outcome: "nothing found" };

  sent.searches += 2;
  const [under, all] = await Promise.all([searchListings(query, limitCents), searchListings(query)]);
  const affordable = under.filter((listing) => listing.cents <= limitCents && !refused.includes(listing.id));
  const above = all.filter((listing) => listing.cents > limitCents && !refused.includes(listing.id));
  const kept = await withPhotos(affordable);
  sent.checked += kept.filter((listing) => listing.photo).length;
  sent.unloaded += affordable.length - kept.length;
  if (!kept.length && !above.length) return { outcome: "nothing found" };

  const choice = await choose(words, kept, above);
  const options: Option[] = [];
  for (const { id, what, why, watch } of choice.picks) {
    const found = kept.find((listing) => listing.id === id);
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
