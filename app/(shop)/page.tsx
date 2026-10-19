import type { Metadata } from "next";
import { cookies } from "next/headers";
import { minutesUntil } from "../../lib/shop/limits";
import { linksIn } from "../../lib/shop/people";
import { start } from "./actions";
import { HomeView } from "./HomeView";

const description =
  "Your parent shops from their own phone, AI explains real options, and you approve from yours. PayPal pays, and nobody shares a password.";

export const metadata: Metadata = {
  title: "KinCart: Mom asks, you say OK",
  description,
  openGraph: { title: "KinCart: Mom asks. You say OK. PayPal pays.", description, siteName: "KinCart" },
};

const outcomes = ["ready", "fresh", "failed"] as const;

export default async function HomePage({ searchParams }: PageProps<"/">) {
  const links = await linksIn((await cookies()).get("household")?.value);
  const { started, until } = await searchParams;
  // Past an address's 5 for the day, the notice counts down until the oldest is a day old.
  const wait = started === "limit" ? minutesUntil(Number(until)) : 0;

  return (
    <main>
      <HomeView
        state={{
          links: links ? { rose: `/r/${links.rose}`, sam: `/h/${links.sam}` } : undefined,
          outcome: wait > 0 ? "limit" : outcomes.find((outcome) => outcome === started),
          waitMinutes: wait > 0 ? wait : undefined,
        }}
        start={start}
      />
    </main>
  );
}
