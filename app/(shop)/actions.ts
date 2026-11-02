"use server";

import type {
  PublicKeyCredentialCreationOptionsJSON,
  PublicKeyCredentialRequestOptionsJSON,
} from "@simplewebauthn/server";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import {
  find as findOptions,
  findAgain,
  findPhoto,
  findRebuy,
  groupOf,
  searchOn,
  type Group,
  type Option,
  type Sent,
} from "../../lib/shop/find";
import { findItem, things } from "../../lib/shop/items";
import { checkCreate, checkGet, createOptions, getOptions } from "../../lib/shop/passkey";
import { addressOf, FINDS_A_DAY, HOUSEHOLDS_A_DAY, keyOf, minutesUntil } from "../../lib/shop/limits";
import { pay } from "../../lib/shop/pay";
import { reasonOf } from "../../lib/shop/paypal";
import { hashOf, newLink, whoIs } from "../../lib/shop/people";
import { parseSubscription, pushOn } from "../../lib/shop/push";
import {
  ask,
  claim,
  clearSearch,
  copyDemoVault,
  countUse,
  decline,
  dropPasskey,
  getLimit,
  getPasskey,
  getSearch,
  getTotal,
  getVault,
  latest,
  paidAsk,
  replaceLinks,
  savePasskey,
  saveSearch,
  saveSubscription,
  setLimit as saveLimit,
  setTotal as saveTotal,
  startHousehold,
  takeUse,
} from "../../lib/shop/requests";
import { origin } from "./origin";
import { beginLink, setupCookie } from "./paypalLink";
import { sendPayment, sendPing } from "./pings";
import { againOf, currentOf, rebuyOf } from "./state";

// Try KinCart and Start a new one: a new household, whose two links this browser keeps (D44). One address
// starts 5 a day at most, and a stopped one keeps this browser's own household.
export async function start(): Promise<void> {
  const jar = await cookies();
  const had = jar.has("household");
  const [rose, sam] = [newLink(), newLink()];

  let started: { household: number } | { until: Date };
  try {
    const until = await takeUse("household", await addressKey(), HOUSEHOLDS_A_DAY);
    started = until ? { until } : { household: await startHousehold(hashOf(rose), hashOf(sam)) };
  } catch (error) {
    console.log(`household status=failed reason=${reasonOf(error)}`);
    redirect("/?started=failed");
  }
  if ("until" in started) {
    const until = started.until.getTime();
    await countUse({ stoppedHouseholds: 1 });
    console.log(`limit kind=household status=stopped wait=${minutesUntil(until)}`);
    redirect(`/?started=limit&until=${until}`);
  }
  jar.set("household", `${rose}.${sam}`, HOUSEHOLD_COOKIE);
  console.log(`household id=${started.household} status=started`);
  redirect(`/?started=${had ? "fresh" : "ready"}`);
}

const HOUSEHOLD_COOKIE = { httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: 90 * 24 * 60 * 60 } as const;

// New links, from Sam's link of a household other than 1, whose links live in Vercel's env (D45). This browser
// follows the new pair when it kept the old one (D44), and Sam's new page gets Rose's new link for 10
// minutes, since only hashes are stored (D47, D120, D121).
export async function makeLinks(token: string, formData: FormData): Promise<void> {
  const who = await whoIs(token);
  if (who?.person !== "sam" || who.household === 1) return;
  if (!(await confirmed(who.household, token, formData.get("passkey")))) {
    console.log(`passkey household=${who.household} status=refused for=links`);
    redirect(`/h/${token}?links=new&refused=links`);
  }
  const [rose, sam] = [newLink(), newLink()];
  const replaced = await replaceLinks(who.household, hashOf(token), hashOf(rose), hashOf(sam));
  if (!replaced) redirect(`/h/${token}`);
  console.log(`links household=${who.household} status=replaced phones=${replaced.phones}`);

  const jar = await cookies();
  if (jar.get("household")?.value.split(".")[1] === token) jar.set("household", `${rose}.${sam}`, HOUSEHOLD_COOKIE);
  jar.set("new_rose", rose, { httpOnly: true, secure: true, sameSite: "lax", path: `/h/${sam}`, maxAge: 10 * 60 });
  redirect(`/h/${sam}`);
}

// Confirm each OK, for Sam of a household other than 1 (D122). Each request for the phone gets a new challenge,
// kept for 5 minutes in a cookie sent only to Sam's link, and cleared once checked (D124).
export async function passkeyOptions(
  token: string,
): Promise<
  | { kind: "create"; options: PublicKeyCredentialCreationOptionsJSON }
  | { kind: "get"; options: PublicKeyCredentialRequestOptionsJSON }
  | null
> {
  const who = await whoIs(token);
  if (who?.person !== "sam" || who.household === 1) return null;
  const passkey = await getPasskey(who.household);
  const at = await origin();
  const asked = passkey
    ? ({ kind: "get", options: await getOptions(at, passkey.credentialId) } as const)
    : ({ kind: "create", options: await createOptions(at) } as const);
  (await cookies()).set(CHALLENGE, asked.options.challenge, challengeCookie(token, 5 * 60));
  return asked;
}

export async function turnOnPasskey(token: string, answer: string): Promise<boolean> {
  const who = await whoIs(token);
  if (who?.person !== "sam" || who.household === 1) return false;
  const passkey = await checkCreate(answer, await takeChallenge(token), await origin());
  const saved = !!passkey && (await savePasskey(who.household, passkey.credentialId, passkey.publicKey));
  console.log(`passkey household=${who.household} status=${saved ? "on" : "refused for=on"}`);
  return saved;
}

export async function turnOffPasskey(token: string, answer: string): Promise<boolean> {
  const who = await whoIs(token);
  if (who?.person !== "sam" || who.household === 1) return false;
  const off = (await getPasskey(who.household)) !== null && (await confirmed(who.household, token, answer));
  if (off) await dropPasskey(who.household);
  console.log(`passkey household=${who.household} status=${off ? "off" : "refused for=off"}`);
  return off;
}

const CHALLENGE = "passkey_challenge";

function challengeCookie(token: string, maxAge: number) {
  return { httpOnly: true, secure: true, sameSite: "lax", path: `/h/${token}`, maxAge } as const;
}

async function takeChallenge(token: string): Promise<string> {
  const jar = await cookies();
  const challenge = jar.get(CHALLENGE)?.value ?? "";
  jar.set(CHALLENGE, "", challengeCookie(token, 0));
  return challenge;
}

// True with no passkey on, or with the phone's signed answer to this browser's challenge.
async function confirmed(household: number, token: string, answer: FormDataEntryValue | null): Promise<boolean> {
  const passkey = await getPasskey(household);
  if (!passkey) return true;
  const challenge = await takeChallenge(token);
  return !!challenge && (await checkGet(answer, passkey, challenge, await origin()));
}

export async function startLink(token: string): Promise<void> {
  if ((await whoIs(token))?.person !== "rose") return;
  const link = await beginLink(token, await origin());
  if (link.setupToken) (await cookies()).set("setup_token", link.setupToken, setupCookie(token));
  redirect(link.to);
}

// Skip: this household pays from a copy of household 1's saved PayPal, as every household did before D58.
export async function skipLink(token: string, formData: FormData): Promise<void> {
  const who = await whoIs(token);
  if (who?.person !== "rose") return;
  // A copy fails also when Rose linked her own in a new tab and then tapped Skip in the old one; that one stays.
  const status = (await copyDemoVault(who.household))
    ? "copied"
    : (await getVault(who.household))
      ? "kept"
      : "failed reason=no demo PayPal";
  console.log(`paypal skip household=${who.household} status=${status}`);

  // A home page phone keeps ?in=phone, so its Link PayPal still opens a new tab (D61).
  const back = new URLSearchParams();
  if (formData.get("in") === "phone") back.set("in", "phone");
  if (status.startsWith("failed")) back.set("cancelled", "1");
  redirect(back.size ? `/r/${token}?${back}` : `/r/${token}`);
}

export async function find(token: string, formData: FormData): Promise<void> {
  const who = await whoIs(token);
  if (who?.person !== "rose") return;
  const words = String(formData.get("words") ?? "").trim().slice(0, 200);
  // An empty file input still sends an empty file. Rose's browser shrank each photo to a JPEG (D70).
  // A request can send more than the picker allows, and each photo costs Haiku tokens, so 5 at most (D68).
  const files = formData.getAll("photo").filter((photo): photo is File => photo instanceof File && photo.size > 0);
  const jpegs = await Promise.all(files.slice(0, 5).map(async (photo) => Buffer.from(await photo.arrayBuffer())));
  // Haiku refuses an image whose bytes don't match its media type, so only real JPEGs go on.
  if (jpegs.some((jpeg) => jpeg.toString("hex", 0, 3) !== "ffd8ff")) redirect(`/r/${token}?find=notphoto`);
  if (!words && !jpegs.length) redirect(`/r/${token}?find=empty`);
  // Past the address's 20 for the day, nothing reaches Claude or Channel3, and Rose's words stay in the box (D77).
  const stopped = await takeUse("find", await addressKey(), FINDS_A_DAY);
  if (stopped) {
    await saveSearch(who.household, words, { outcome: "retry" });
    await countUse({ stoppedFinds: 1 });
    console.log(`limit kind=find status=stopped wait=${minutesUntil(stopped.getTime())}`);
    redirect(`/r/${token}?find=limit&until=${stopped.getTime()}`);
  }
  const limitCents = await getLimit(who.household);
  const sent: Sent = { searches: 0, checked: 0, unloaded: 0 };
  if (jpegs.length) {
    // The photos go no further than Haiku: only the AI's words for them are kept (D64).
    const found = await findPhoto(words, limitCents, jpegs, sent);
    await saveSearch(who.household, found.words, found.result, found.photos, found.blank);
  } else {
    await saveSearch(who.household, words, await findOptions(words, limitCents, sent));
  }
  await countUse({ finds: 1, searches: sent.searches });
  redirect(`/r/${token}`);
}

// Searches again what Rose's screen offers Find another for, worked out from Neon only (D23). Sam's link
// searches only after a No or an untick, never Rose's own Find, and Rose hears how it ended (D113, D114). It
// counts as a Find, toward the tapper's address's 20 a day and on /status (D115), and a stopped one saves
// nothing (D101).
export async function findAnother(token: string, formData: FormData): Promise<void> {
  const who = await whoIs(token);
  if (!who || !searchOn()) return;
  const { household } = who;
  const bySam = who.person === "sam";
  const page = bySam ? `/h/${token}` : `/r/${token}`;
  const tapped = bySam ? null : formData.get("another");
  const [saved, request] = await Promise.all([getSearch(household), latest(household)]);
  const again = bySam && currentOf(saved, request) ? null : againOf(saved, request, tapped === null ? undefined : Number(tapped));
  if (!again) redirect(page);

  // A group's Find another sends the Ask Sam form, so Rose's picks in the other groups come back (D36).
  const picked =
    again.group !== undefined && saved?.outcome === "basket"
      ? saved.groups.map((_, index) => (index === again.group ? "" : String(formData.get(`pick-${index}`) ?? "")))
      : [];
  const back = picked.length ? `picked=${picked.map(encodeURIComponent).join(",")}` : "";
  const stopped = await takeUse("find", await addressKey(), FINDS_A_DAY);
  if (stopped) {
    await countUse({ stoppedFinds: 1 });
    console.log(`limit kind=find status=stopped wait=${minutesUntil(stopped.getTime())}`);
    redirect(`${page}?find=limit&until=${stopped.getTime()}${back && `&${back}`}`);
  }

  const sent: Sent = { searches: 0, checked: 0, unloaded: 0 };
  const found = await findAgain(again.words, again.things, await getLimit(household), sent);
  let kept = true;
  if (again.group !== undefined && saved?.outcome === "basket") {
    // Only the tapped group changes. The basket keeps its photo counts, and its own tried.
    const groups = saved.groups.map((group, index) =>
      index === again.group ? { ...groupOf(group.thing, found), tried: true } : group,
    );
    await saveSearch(household, saved.words, { outcome: "basket", groups }, saved.photos, saved.blankPhotos, saved.tried);
  } else {
    // A Find Rose ran while Sam's searched stays, and Rose hears nothing of Sam's.
    kept = await saveSearch(household, again.words, found, 0, 0, true, bySam, bySam ? (saved?.searchedAt ?? null) : undefined);
  }
  await countUse({ finds: 1, searches: sent.searches });
  if (bySam && kept) {
    // A search over Sam's limit shows Rose the listings above it that fit (D110).
    const options = found.outcome === "options" || found.outcome === "basket" || (found.outcome === "over limit" && found.options?.length);
    sendPing(household, options ? "options again" : "nothing again", request!);
  }
  redirect(back ? `${page}?${back}` : page);
}

// Searches again what Sam paid for in one of Rose's asks, found in Neon by its id for Rose's household only
// (D23, D102). It counts as a Find (D106), and a stopped one saves nothing and stays on the ask screen.
export async function rebuy(token: string, formData: FormData): Promise<void> {
  const who = await whoIs(token);
  if (who?.person !== "rose" || !searchOn()) return;
  const { household } = who;
  const [paid, request] = await Promise.all([paidAsk(household, Number(formData.get("request"))), latest(household)]);
  const open = request?.status === "waiting" || request?.status === "paying";
  const again = paid && !open ? rebuyOf(paid) : null;
  if (!again) redirect(`/r/${token}`);

  const stopped = await takeUse("find", await addressKey(), FINDS_A_DAY);
  if (stopped) {
    await countUse({ stoppedFinds: 1 });
    console.log(`limit kind=find status=stopped wait=${minutesUntil(stopped.getTime())}`);
    redirect(`/r/${token}?ask=1&find=limit&until=${stopped.getTime()}`);
  }

  const sent: Sent = { searches: 0, checked: 0, unloaded: 0 };
  await saveSearch(household, again.words, await findRebuy(again.words, again.things, await getLimit(household), sent));
  await countUse({ finds: 1, searches: sent.searches });
  redirect(`/r/${token}`);
}

export async function tryAgain(token: string): Promise<void> {
  const who = await whoIs(token);
  if (who?.person !== "rose") return;
  const saved = await getSearch(who.household);
  if (saved) await saveSearch(who.household, saved.words, { outcome: "retry" });
  redirect(`/r/${token}`);
}

export async function askSam(token: string, formData: FormData): Promise<void> {
  const who = await whoIs(token);
  if (who?.person !== "rose") return;
  // A basket group's Find another sends this form, with Rose's picks, and asks Sam nothing.
  if (formData.has("another")) return findAnother(token, formData);
  const { household } = who;
  if (searchOn()) {
    const saved = await getSearch(household);
    const option = saved?.options.find((listing) => listing.id === formData.get("listing"));
    const picks =
      saved?.outcome === "basket"
        ? basketPicks(saved.groups, formData)
        : option && saved
          ? [{ thing: saved.words, query: saved.query ?? saved.words, option }]
          : [];
    if (!picks.length) redirect(`/r/${token}?pick=missing`);
    // Each pick's thing, query and listing, so Find another can search again without it (D100).
    const queries = picks.map(({ thing, query, option: { id } }) => ({ id, thing, query }));
    // Sam's total limit counts everything asked for at once, one pick or several (D34).
    const cents = picks.reduce((sum, { option }) => sum + option.cents, 0);
    const total = await getTotal(household);
    if (total !== null && cents > total) {
      console.log(`ask status=over cents=${cents} total=${total}`);
      // One place per group, empty for a group left out, so each group gets its own pick back.
      const over =
        saved?.outcome === "basket"
          ? saved.groups.map(({ options }, index) => options.find(({ id }) => id === formData.get(`pick-${index}`))?.id ?? "")
          : picks.map(({ option }) => option.id);
      redirect(`/r/${token}?over=${over.map(encodeURIComponent).join(",")}`);
    }
    if (await getVault(household)) {
      if (picks.length === 1) {
        const [{ option }] = picks;
        const { shop, url, why, watch, imageUrl } = option;
        if (await ask(household, option, { shop, url, reason: why, watch, imageUrl }, undefined, queries))
          sendPing(household, "asked", { item: option });
      } else {
        const lines = picks.map(({ thing, option: { id, name, cents, shop, url, why, watch, imageUrl } }) => ({
          id,
          name,
          cents,
          shop,
          url,
          reason: why,
          watch,
          imageUrl,
          thing,
        }));
        const item = { id: "basket", name: things(lines.length), cents };
        if (await ask(household, item, undefined, lines, queries)) sendPing(household, "asked", { item, lines });
      }
      await clearSearch(household);
    }
    redirect(`/r/${token}`);
  }
  const item = findItem(formData.get("item"));
  if (!item) redirect(`/r/${token}?pick=missing`);
  if ((await getVault(household)) && (await ask(household, item))) sendPing(household, "asked", { item });
  redirect(`/r/${token}`);
}

export async function answer(token: string, requestId: number, formData: FormData): Promise<void> {
  const who = await whoIs(token);
  if (who?.person !== "sam") return;
  const choice = formData.get("answer");
  // A home page phone keeps ?in=phone, so its next OK still opens Sam's own page in a new tab (D125).
  const page = formData.get("in") === "phone" ? `/h/${token}?in=phone` : `/h/${token}`;
  const declined = choice === "no" ? await decline(who.household, requestId) : null;
  if (declined) {
    console.log(`purchase id=${requestId} status=declined`);
    sendPing(who.household, "declined", declined);
  } else if (choice === "ok") {
    if (!(await confirmed(who.household, token, formData.get("passkey")))) {
      console.log(`passkey household=${who.household} status=refused for=ok`);
      redirect(`${page}${page.includes("?") ? "&" : "?"}refused=ok`);
    }
    const claimed = await claim(who.household, requestId, formData.getAll("line").map(String));
    if (claimed) sendPayment(await pay(claimed), claimed);
  }
  redirect(page);
}

export async function setLimit(token: string, formData: FormData): Promise<void> {
  const who = await whoIs(token);
  if (who?.person !== "sam") return;
  const dollars = Number(String(formData.get("limit") ?? "").trim());
  if (!Number.isInteger(dollars) || dollars < 5 || dollars > 500) redirect(`/h/${token}?limit=invalid`);
  await saveLimit(who.household, dollars * 100);
  redirect(`/h/${token}?limit=saved`);
}

// An empty box clears the total limit.
export async function setTotal(token: string, formData: FormData): Promise<void> {
  const who = await whoIs(token);
  if (who?.person !== "sam") return;
  const typed = String(formData.get("total") ?? "").trim();
  const dollars = Number(typed);
  if (typed && (!Number.isInteger(dollars) || dollars < 5 || dollars > 2500)) redirect(`/h/${token}?total=invalid`);
  await saveTotal(who.household, typed ? dollars * 100 : null);
  redirect(`/h/${token}?total=saved`);
}

export async function subscribe(token: string, json: unknown): Promise<boolean> {
  const who = await whoIs(token);
  const subscription = parseSubscription(json);
  if (!who || !subscription || !pushOn()) return false;
  await saveSubscription(who.household, who.person, subscription);
  return true;
}

// Each group's radio is pick-<index>, and a listing picked under two things counts once. A group from before
// queries were kept searched for its thing.
function basketPicks(groups: Group[], formData: FormData): { thing: string; query: string; option: Option }[] {
  const picks: { thing: string; query: string; option: Option }[] = [];
  groups.forEach(({ thing, query, options }, index) => {
    const option = options.find((listing) => listing.id === formData.get(`pick-${index}`));
    if (option && !picks.some((pick) => pick.option.id === option.id)) picks.push({ thing, query: query ?? thing, option });
  });
  return picks;
}

// The address Vercel says the request came from, as the key its uses are counted under.
async function addressKey(): Promise<string> {
  return keyOf(addressOf((await headers()).get("x-forwarded-for")));
}
