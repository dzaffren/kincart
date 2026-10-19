import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { HomeView, type HomeState } from "../../HomeView";
import { RoseView } from "../../RoseView";
import { PageHead } from "../../ui";
import "../approve-and-pay/preview.css";

const ask = { kind: "ask", limitCents: 2500, words: "a night light", problem: "limit" } as const;

// Rose's notices side by side, or the home page with ?home=new or ?home=yours.
export default async function FindLimitsPreview({ searchParams }: PageProps<"/preview/find-limits">) {
  if (process.env.VERCEL_ENV === "production") notFound();
  const { home } = await searchParams;
  const links = { rose: `/r/${process.env.ROSE_LINK_TOKEN}`, sam: `/h/${process.env.SAM_LINK_TOKEN}` };
  const homes: Record<string, HomeState> = {
    new: { outcome: "limit", waitMinutes: 290 },
    yours: { links, outcome: "limit", waitMinutes: 290 },
  };
  if (typeof home === "string" && homes[home]) {
    return (
      <main>
        <HomeView state={homes[home]} />
      </main>
    );
  }

  return (
    <main className="preview">
      <section className="preview-section">
        <h2>Rose&apos;s Find, past the day&apos;s limit</h2>
        <div className="frames">
          <Frame label="Oldest Find drops out in 3 hours (scenario 2)">
            <PageHead />
            <RoseView state={{ ...ask, waitMinutes: 180 }} items={[]} />
          </Frame>
          <Frame label="Oldest Find drops out in 25 minutes">
            <PageHead />
            <RoseView state={{ ...ask, waitMinutes: 25 }} items={[]} />
          </Frame>
        </div>
      </section>
    </main>
  );
}

function Frame({ label, children }: { label: string; children: ReactNode }) {
  return (
    <figure className="frame">
      <figcaption>{label}</figcaption>
      {children}
    </figure>
  );
}
