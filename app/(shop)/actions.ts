"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { findItem } from "../../lib/shop/items";
import { pay } from "../../lib/shop/pay";
import { createSetupToken } from "../../lib/shop/paypal";
import { whoIs } from "../../lib/shop/people";
import { ask, claim, decline, getVault } from "../../lib/shop/requests";

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

export async function askSam(token: string, formData: FormData): Promise<void> {
  if (whoIs(token) !== "rose") return;
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

async function origin(): Promise<string> {
  const head = await headers();
  return `${head.get("x-forwarded-proto") ?? "http"}://${head.get("x-forwarded-host") ?? head.get("host")}`;
}
