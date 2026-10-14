import { notFound } from "next/navigation";
import { HomeView, type HomeState } from "../../HomeView";

const states: Record<string, HomeState> = {
  done: { outcome: "done" },
  paying: { outcome: "paying" },
  busy: { busy: true },
};

// One state per address: ?state=done, ?state=paying or ?state=busy. The layout follows the window's width.
export default async function DemoHomePreview({ searchParams }: PageProps<"/preview/demo-home">) {
  if (process.env.VERCEL_ENV === "production") notFound();
  const { state } = await searchParams;

  return (
    <main>
      <HomeView
        state={states[typeof state === "string" ? state : ""] ?? {}}
        rose={`/r/${process.env.ROSE_LINK_TOKEN}`}
        sam={`/h/${process.env.SAM_LINK_TOKEN}`}
      />
    </main>
  );
}
