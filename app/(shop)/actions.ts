"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { find as findOptions, searchOn, type Group, type Option } from "../../lib/shop/find";
import { findItem, things } from "../../lib/shop/items";
import { pay } from "../../lib/shop/pay";
import { createSetupToken } from "../../lib/shop/paypal";
import { whoIs } from "../../lib/shop/people";
import { parseSubscription, pushOn } from "../../lib/shop/push";
import {
  ask,
  claim,
  clearSearch,
  decline,
  getLimit,
  getSearch,
  getTotal,
  getVault,
  saveSearch,
  saveSubscription,
  setLimit as saveLimit,
  setTotal as saveTotal,
} from "../../lib/shop/requests";
import { sendPayment, sendPing } from "./pings";

export async function startLink(token: string): Promise<void> {
  if ((await whoIs(token))?.person !== "rose") return;
  const page = `${await origin()}/r/${token}`;

  let approveUrl: string;
  try {
    const setup = await createSetupToken(`${page}/linked`, `${page}?cancelled=1`);
    (await cookies()).set("setup_token", setup.id, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: `/r/${token}`,
      maxAge: 3600,
    });
    approveUrl = setup.approveUrl;
  } catch (error) {
    console.log(`paypal link status=failed reason=${error instanceof Error ? error.message : error}`);
    redirect(`/r/${token}?cancelled=1`);
  }
  redirect(approveUrl);
}

export async function find(token: string, formData: FormData): Promise<void> {
  const who = await whoIs(token);
  if (who?.person !== "rose") return;
  const words = String(formData.get("words") ?? "").trim().slice(0, 200);
  if (!words) redirect(`/r/${token}?find=empty`);
  await saveSearch(who.household, words, await findOptions(words, await getLimit(who.household)));
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
  const { household } = who;
  if (searchOn()) {
    const saved = await getSearch(household);
    const option = saved?.options.find((listing) => listing.id === formData.get("listing"));
    const picks = saved?.outcome === "basket" ? basketPicks(saved.groups, formData) : option ? [{ thing: "", option }] : [];
    if (!picks.length) redirect(`/r/${token}?pick=missing`);
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
        if (await ask(household, option, { shop: option.shop, url: option.url, reason: option.why }))
          sendPing(household, "asked", { item: option });
      } else {
        const lines = picks.map(({ thing, option: { id, name, cents, shop, url, why } }) => ({
          id,
          name,
          cents,
          shop,
          url,
          reason: why,
          thing,
        }));
        const item = { id: "basket", name: things(lines.length), cents };
        if (await ask(household, item, undefined, lines)) sendPing(household, "asked", { item, lines });
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
  const declined = choice === "no" ? await decline(who.household, requestId) : null;
  if (declined) {
    console.log(`purchase id=${requestId} status=declined`);
    sendPing(who.household, "declined", declined);
  } else if (choice === "ok") {
    const claimed = await claim(who.household, requestId, formData.getAll("line").map(String));
    if (claimed) sendPayment(await pay(claimed), claimed);
  }
  redirect(`/h/${token}`);
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

// Each group's radio is pick-<index>, and a listing picked under two things counts once.
function basketPicks(groups: Group[], formData: FormData): { thing: string; option: Option }[] {
  const picks: { thing: string; option: Option }[] = [];
  groups.forEach(({ thing, options }, index) => {
    const option = options.find((listing) => listing.id === formData.get(`pick-${index}`));
    if (option && !picks.some((pick) => pick.option.id === option.id)) picks.push({ thing, option });
  });
  return picks;
}

async function origin(): Promise<string> {
  const head = await headers();
  return `${head.get("x-forwarded-proto") ?? "http"}://${head.get("x-forwarded-host") ?? head.get("host")}`;
}
