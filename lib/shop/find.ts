import { choose, otherWords, readNeed, readPhoto, type Choice, type Need, type PhotoNeed } from "./ai";
import { reasonOf } from "./paypal";
import { searchListings, withPhotos, type Found, type Listing } from "./search";

export type Option = Listing & { what: string; why: string; watch: string };

type Problem = "nothing found" | "over limit";

// The listing Sam paid for last time, which Ask again looks for in today's search. nowCents is its price
// today when it's over Sam's limit now.
export type Last = { id: string; cents: number; shop: string; nowCents?: number };

// thing is what Rose called it, such as "a night light". query is the shop search it last ran, which
// Find another avoids, and tried marks a group that Find another searched. last marks a group that Ask again searched.
export type Group = { thing: string; options: Option[]; problem?: Problem; query?: string; tried?: boolean; last?: Last };

// An over-limit search keeps the listings over Sam's limit that the pick step says fit, when it found some (D111).
type Single = (
  | { outcome: "options"; options: Option[] }
  | { outcome: "over limit"; options?: Option[] }
  | { outcome: "nothing found" }
) & { query?: string; last?: Last };

// A basket whose every group found nothing keeps its groups, so Find another can search each thing again (D99).
export type Search =
  | Single
  | { outcome: "basket"; groups: Group[] }
  | { outcome: "nothing found"; groups: Group[] }
  | { outcome: "too many" | "nothing in photo" };

// words are what the search was for: Rose's own, or the AI's words for Rose's photos. blank counts
// the photos that showed nothing to buy.
type Searched = { words: string; result: Search; blank?: number };

export type PhotoSearch = { words: string; result: Search; photos: number; blank: number };

// A thing that Find another searches again: what Rose called it, the query that gave Rose nothing to use,
// and the listing ids Sam refused (D98).
export type Again = { words: string; query: string; refused: string[] };

// A thing that Ask again searches: what Rose called it, last time's query, and the listing Sam paid for.
export type Rebuy = { words: string; query: string; last: { id: string; name: string; cents: number; shop: string } };

// searches are the Channel3 calls a Find sent, whatever they answered, for /status (D81). checked are the
// listings sent to Haiku with a photo, and unloaded the listings dropped for their photo. Those two are for the log.
export type Sent = { searches: number; checked: number; unloaded: number };

const MOST_THINGS = 5;

// The second pick call sees this many of the cheapest listings over Sam's limit, and none above double it (D112).
const MOST_OVER = 5;

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
    () => " again=1",
  );
  return result;
}

// Each thing Sam paid for searches last time's query again, and last time's listing by its name (D105). One
// thing gives a single search, and several a basket, or nothing found with its groups, as Find gives (D99).
export async function findRebuy(
  words: string,
  things: Rebuy[],
  limitCents: number,
  sent: Sent = { searches: 0, checked: 0, unloaded: 0 },
): Promise<Search> {
  const { result } = await logged(
    words,
    0,
    sent,
    async (reasons) => {
      // A thing whose search fails blanks only itself (D31).
      const found = await Promise.all(
        things.map(async ({ words: thing, query, last }): Promise<Single> => {
          try {
            return { ...(await searchThing(thing, query, limitCents, sent, [], last)), query };
          } catch (error) {
            reasons.push(reasonOf(error));
            return { outcome: "nothing found", query };
          }
        }),
      );
      if (things.length === 1) return { words, result: found[0] };
      const groups = things.map(({ words: thing }, index) => groupOf(thing, found[index]));
      const shown = groups.some((group) => group.options.length);
      return { words, result: shown ? { outcome: "basket", groups } : { outcome: "nothing found", groups } };
    },
    (result) => ` rebuy=1 same=${sameOf(result, things)}`,
  );
  return result;
}

// A one-thing search as one group of a basket, so a basket's groups and Find another's search of one
// group come out alike. A group over the limit keeps the listings over it that fit (D111).
export function groupOf(thing: string, result: Search): Group {
  const query = "query" in result ? result.query : undefined;
  const last = "last" in result ? result.last : undefined;
  if (result.outcome === "options") return { thing, options: result.options, query, last };
  if (result.outcome === "over limit") return { thing, options: result.options ?? [], problem: "over limit", query, last };
  return { thing, options: [], problem: "nothing found", query, last };
}

// A photo that a thing is in is never blank, and a number past Rose's photos never counts (D69).
function blankOf({ things, blank }: PhotoNeed, photos: number): number {
  const covered = new Set(things.flatMap((thing) => thing.photos));
  const counted = blank.filter((photo) => Number.isInteger(photo) && photo >= 1 && photo <= photos && !covered.has(photo));
  return new Set(counted).size;
}

// A search that fails says nothing found under Rose's own words, and the log line says why. mark adds to the
// line for a Find another or an Ask again.
async function logged(
  words: string,
  photos: number,
  sent: Sent,
  run: (reasons: string[]) => Promise<Searched>,
  mark: (result: Search) => string = () => "",
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
    `find outcome=${result.outcome.replaceAll(" ", "-")} ${counts(result)} searches=${sent.searches} ms=${Date.now() - started} checked=${sent.checked} unloaded=${sent.unloaded}${photo}${mark(result)}${reason}`,
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
  return groups.some((group) => group.options.length) ? { outcome: "basket", groups } : { outcome: "nothing found", groups };
}

// refused are listings Sam said no to, which Find another leaves out (D98). last is the listing Sam paid for
// last time, which Ask again also searches by its name (D105).
async function searchThing(
  words: string,
  query: string,
  limitCents: number,
  sent: Sent,
  refused: string[] = [],
  last?: Rebuy["last"],
): Promise<Single> {
  if (!query.trim()) return { outcome: "nothing found" };

  sent.searches += last ? 3 : 2;
  const [under, all, named] = await Promise.all([
    searchListings(query, limitCents),
    searchListings(query),
    last ? searchListings(last.name) : [],
  ]);
  const bought = last && [...under, ...all, ...named].find((listing) => listing.id === last.id);
  const affordable = [...under, ...(bought ? [bought] : [])].filter(
    (listing, index, listings) =>
      listing.cents <= limitCents &&
      !refused.includes(listing.id) &&
      listings.findIndex(({ id }) => id === listing.id) === index,
  );
  const above = all.filter((listing) => listing.cents > limitCents && !refused.includes(listing.id));
  const kept = await withPhotos(affordable);
  sent.checked += kept.filter((listing) => listing.photo).length;
  sent.unloaded += affordable.length - kept.length;
  // Rose's page says what changed from last time, and the price today only when it's over the limit (D103).
  const was = last && {
    id: last.id,
    cents: last.cents,
    shop: last.shop,
    ...(bought && bought.cents > limitCents && { nowCents: bought.cents }),
  };
  const done = (single: Single): Single => (was ? { ...single, last: was } : single);
  if (!kept.length && !above.length) return done({ outcome: "nothing found" });

  const lastId = kept.find((listing) => listing.id === last?.id)?.id;
  const choice = await choose(words, kept, above, lastId);
  const options = optionsOf(choice.picks, kept);
  // Last time's listing goes first when the pick step keeps it (D104).
  options.sort((a, b) => Number(b.id === lastId) - Number(a.id === lastId));
  if (options.length) return done({ outcome: "options", options: options.slice(0, 3) });
  if (!choice.aboveLimit) return done({ outcome: "nothing found" });
  const over = await overLimit(words, [...above, ...(bought ? [bought] : [])], limitCents, sent, last?.id);
  return done(over.length ? { outcome: "over limit", options: over } : { outcome: "over limit" });
}

// A second pick call checks the cheapest listings up to double Sam's limit with their photos, and last time's
// listing too, so a listing over the limit passes the same photo check (D89, D112). Its picks come cheapest
// first, after last time's listing (D104, D111). A failed call shows none, as a failed pick step does (D93).
async function overLimit(words: string, above: Found[], limitCents: number, sent: Sent, lastId?: string): Promise<Option[]> {
  const near = above
    .filter(
      (listing, index) =>
        listing.cents > limitCents && listing.cents <= limitCents * 2 && above.findIndex(({ id }) => id === listing.id) === index,
    )
    .sort((a, b) => a.cents - b.cents)
    .filter((listing, index) => index < MOST_OVER || listing.id === lastId);
  const kept = await withPhotos(near);
  sent.checked += kept.filter((listing) => listing.photo).length;
  sent.unloaded += near.length - kept.length;
  if (!kept.length) return [];

  const keptLast = kept.find((listing) => listing.id === lastId)?.id;
  const choice = await choose(words, kept, [], keptLast).catch(() => undefined);
  const options = choice ? optionsOf(choice.picks, kept) : [];
  options.sort((a, b) => Number(b.id === keptLast) - Number(a.id === keptLast) || a.cents - b.cents);
  return options.slice(0, 3);
}

// The pick step's picks, each once, from the listings it was sent.
function optionsOf(picks: Choice["picks"], listings: Found[]): Option[] {
  const options: Option[] = [];
  for (const { id, what, why, watch } of picks) {
    const found = listings.find((listing) => listing.id === id);
    if (found && !options.some((option) => option.id === id)) options.push({ ...listingOf(found), what, why, watch });
  }
  return options;
}

// How many things show the listing Sam paid for last time, of how many Ask again searched.
function sameOf(result: Search, things: Rebuy[]): string {
  const shown =
    result.outcome === "options" ? result.options : "groups" in result ? result.groups.flatMap(({ options }) => options) : [];
  return `${things.filter(({ last }) => shown.some(({ id }) => id === last.id)).length}/${things.length}`;
}

function counts(result: Search): string {
  if (result.outcome !== "basket") return `listings=${"options" in result ? (result.options?.length ?? 0) : 0}`;
  const shown = result.groups.filter((group) => group.options.length);
  const listings = shown.reduce((sum, group) => sum + group.options.length, 0);
  return `things=${result.groups.length} shown=${shown.length} listings=${listings}`;
}

function listingOf({ id, name, cents, shop, url, imageUrl }: Found): Listing {
  return { id, name, cents, shop, url, imageUrl };
}
