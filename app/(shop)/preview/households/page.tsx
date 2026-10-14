import { notFound } from "next/navigation";
import { HomeView, type HomeState } from "../../HomeView";

const links = { rose: "/r/rose-link-4f9c2a7e", sam: "/h/sam-link-b81d5e30" };

const states: Record<string, HomeState> = {
  new: {},
  starting: { busy: true },
  failed: { outcome: "failed" },
  ready: { links, outcome: "ready" },
  yours: { links },
  restarting: { links, busy: true },
  fresh: { links, outcome: "fresh" },
};

// One state per address: ?state=new, starting, failed, ready, yours, restarting or fresh.
export default async function HouseholdsPreview({ searchParams }: PageProps<"/preview/households">) {
  if (process.env.VERCEL_ENV === "production") notFound();
  const { state } = await searchParams;

  return (
    <main>
      <HomeView state={states[typeof state === "string" ? state : ""] ?? {}} />
    </main>
  );
}
