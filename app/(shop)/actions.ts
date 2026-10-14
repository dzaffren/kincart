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
  if (whoIs(token) !== "rose") return;
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
  if (whoIs(token) !== "rose") return;
  const words = String(formData.get("words") ?? "").trim().slice(0, 200);
  if (!words) redirect(`/r/${token}?find=empty`);
  await saveSearch(words, await findOptions(words, await getLimit()));
  redirect(`/r/${token}`);
}

export async function tryAgain(token: string): Promise<void> {
  if (whoIs(token) !== "rose") return;
  const saved = await getSearch();
  if (saved) await saveSearch(saved.words, { outcome: "retry" });
  redirect(`/r/${token}`);
}

export async function askSam(token: string, formData: FormData): Promise<void> {
  if (whoIs(token) !== "rose") return;
  if (searchOn()) {
    const saved = await getSearch();
    const option = saved?.options.find((listing) => listing.id === formData.get("listing"));
    const picks = saved?.outcome === "basket" ? basketPicks(saved.groups, formData) : option ? [{ thing: "", option }] : [];
    if (!picks.length) redirect(`/r/${token}?pick=missing`);
    // Sam's total limit counts everything asked for at once, one pick or several (D34).
    const cents = picks.reduce((sum, { option }) => sum + option.cents, 0);
    const total = await getTotal();
    if (total !== null && cents > total) {
      console.log(`ask status=over cents=${cents} total=${total}`);
      redirect(`/r/${token}?over=${picks.map(({ option }) => encodeURIComponent(option.id)).join(",")}`);
    }
    if (await getVault()) {
      if (picks.length === 1) {
        const [{ option }] = picks;
        if (await ask(option, { shop: option.shop, url: option.url, reason: option.why })) sendPing("asked", { item: option });
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
        if (await ask(item, undefined, lines)) sendPing("asked", { item, lines });
      }
      await clearSearch();
    }
    redirect(`/r/${token}`);
  }
  const item = findItem(formData.get("item"));
  if (!item) redirect(`/r/${token}?pick=missing`);
  if ((await getVault()) && (await ask(item))) sendPing("asked", { item });
  redirect(`/r/${token}`);
}

export async function answer(token: string, requestId: number, formData: FormData): Promise<void> {
  if (whoIs(token) !== "sam") return;
  const choice = formData.get("answer");
  const declined = choice === "no" ? await decline(requestId) : null;
  if (declined) {
    console.log(`purchase id=${requestId} status=declined`);
    sendPing("declined", declined);
  } else if (choice === "ok") {
    const claimed = await claim(requestId, formData.getAll("line").map(String));
    if (claimed) sendPayment(await pay(claimed), claimed);
  }
  redirect(`/h/${token}`);
}

export async function setLimit(token: string, formData: FormData): Promise<void> {
  if (whoIs(token) !== "sam") return;
  const dollars = Number(String(formData.get("limit") ?? "").trim());
  if (!Number.isInteger(dollars) || dollars < 5 || dollars > 500) redirect(`/h/${token}?limit=invalid`);
  await saveLimit(dollars * 100);
  redirect(`/h/${token}?limit=saved`);
}

// An empty box clears the total limit.
export async function setTotal(token: string, formData: FormData): Promise<void> {
  if (whoIs(token) !== "sam") return;
  const typed = String(formData.get("total") ?? "").trim();
  const dollars = Number(typed);
  if (typed && (!Number.isInteger(dollars) || dollars < 5 || dollars > 2500)) redirect(`/h/${token}?total=invalid`);
  await saveTotal(typed ? dollars * 100 : null);
  redirect(`/h/${token}?total=saved`);
}

export async function subscribe(token: string, json: unknown): Promise<boolean> {
  const person = whoIs(token);
  const subscription = parseSubscription(json);
  if (!person || !subscription || !pushOn()) return false;
  await saveSubscription(person, subscription);
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
