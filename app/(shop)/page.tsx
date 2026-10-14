import type { Metadata } from "next";
import { cookies } from "next/headers";
import { linksIn } from "../../lib/shop/people";
import { start } from "./actions";
import { HomeView } from "./HomeView";

export const metadata: Metadata = { title: "KinCart" };

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
