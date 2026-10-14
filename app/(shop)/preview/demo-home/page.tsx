import { notFound } from "next/navigation";
import { HomeView, type HomeState } from "../../HomeView";

// One state per address: ?state=new, starting, failed, ready, yours, restarting or fresh. The layout follows the
// window's width, and the phones show household 1's real pages.
export default async function DemoHomePreview({ searchParams }: PageProps<"/preview/demo-home">) {
  if (process.env.VERCEL_ENV === "production") notFound();
  const { state } = await searchParams;
  const links = { rose: `/r/${process.env.ROSE_LINK_TOKEN}`, sam: `/h/${process.env.SAM_LINK_TOKEN}` };

  const states: Record<string, HomeState> = {
    new: {},
    starting: { busy: true },
    failed: { outcome: "failed" },
    ready: { links, outcome: "ready" },
    yours: { links },
    restarting: { links, busy: true },
    fresh: { links, outcome: "fresh" },
  };

  return (
    <main>
      <HomeView state={states[typeof state === "string" ? state : ""] ?? {}} />
    </main>
  );
}
