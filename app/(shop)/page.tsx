import type { Metadata } from "next";
import { cookies } from "next/headers";
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
  const { started } = await searchParams;

  return (
    <main>
      <HomeView
        state={{
          links: links ? { rose: `/r/${links.rose}`, sam: `/h/${links.sam}` } : undefined,
          outcome: outcomes.find((outcome) => outcome === started),
        }}
        start={start}
      />
    </main>
  );
}
