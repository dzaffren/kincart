"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { find as findOptions, searchOn } from "../../lib/shop/find";
import { findItem } from "../../lib/shop/items";
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
  getVault,
  saveSearch,
  saveSubscription,
  setLimit as saveLimit,
} from "../../lib/shop/requests";

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
    if (!option) redirect(`/r/${token}?pick=missing`);
    if (await getVault()) {
      await ask(option, { shop: option.shop, url: option.url, reason: option.why });
      await clearSearch();
    }
    redirect(`/r/${token}`);
  }
  const item = findItem(formData.get("item"));
  if (!item) redirect(`/r/${token}?pick=missing`);
  if (await getVault()) await ask(item);
  redirect(`/r/${token}`);
}

export async function answer(token: string, requestId: number, formData: FormData): Promise<void> {
  if (whoIs(token) !== "sam") return;
  const choice = formData.get("answer");
  if (choice === "no" && (await decline(requestId))) {
    console.log(`purchase id=${requestId} status=declined`);
  } else if (choice === "ok") {
    const claimed = await claim(requestId);
    if (claimed) await pay(claimed);
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

export async function subscribe(token: string, json: unknown): Promise<boolean> {
  const person = whoIs(token);
  const subscription = parseSubscription(json);
  if (!person || !subscription || !pushOn()) return false;
  await saveSubscription(person, subscription);
  return true;
}

async function origin(): Promise<string> {
  const head = await headers();
  return `${head.get("x-forwarded-proto") ?? "http"}://${head.get("x-forwarded-host") ?? head.get("host")}`;
}
