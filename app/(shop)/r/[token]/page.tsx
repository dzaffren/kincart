import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { searchOn } from "../../../../lib/shop/find";
import { ITEMS } from "../../../../lib/shop/items";
import { settleStuck } from "../../../../lib/shop/pay";
import { demoLogin } from "../../../../lib/shop/paypal";
import { whoIs } from "../../../../lib/shop/people";
import { publicKey, pushOn } from "../../../../lib/shop/push";
import { getLimit, getSearch, getTotal, getVault, latest } from "../../../../lib/shop/requests";
import { askSam, find, skipLink, startLink, tryAgain } from "../../actions";
import { NotifyControl } from "../../NotifyControl";
import { sendPayment } from "../../pings";
import { Refresher } from "../../Refresher";
import { RoseView } from "../../RoseView";
import { roseState } from "../../state";
import { PageHead } from "../../ui";

// Find waits on Haiku and Channel3: about 10 s in the spike.
export const maxDuration = 30;

// The Home Screen icon opens this person's own link, not the site's front page (D28).
export async function generateMetadata({ params }: PageProps<"/r/[token]">): Promise<Metadata> {
  const { token } = await params;
  return { manifest: `/manifest/${token}`, appleWebApp: { capable: true, title: "KinCart" } };
}

export default async function RosePage({ params, searchParams }: PageProps<"/r/[token]">) {
  await connection();
  const { token } = await params;
  const who = await whoIs(token);
  if (who?.person !== "rose") notFound();
  const { household } = who;
  const query = await searchParams;

  const settled = await settleStuck(household);
  if (settled) sendPayment(settled.result, settled.request);
  const on = searchOn();
  const [vault, request, saved, limitCents, totalCents] = await Promise.all([
    getVault(household),
    latest(household),
    on ? getSearch(household) : null,
    on ? getLimit(household) : 0,
    on ? getTotal(household) : null,
  ]);
  const state = roseState(
    vault,
    request,
    {
      cancelled: query.cancelled === "1",
      linked: query.linked === "1",
      pickMissing: query.pick === "missing",
      askAgain: query.ask === "1",
      emptyFind: query.find === "empty",
      notPhoto: query.find === "notphoto",
      over: typeof query.over === "string" ? query.over.split(",") : undefined,
    },
    on ? { saved, limitCents, totalCents } : undefined,
  );

  return (
    <>
      <PageHead />
      <main>
        <RoseView
          state={state}
          items={ITEMS}
          link={startLink.bind(null, token)}
          skip={skipLink.bind(null, token)}
          login={demoLogin()}
          framedLink={query.in === "phone" ? `/r/${token}/link` : undefined}
          ask={askSam.bind(null, token)}
          find={find.bind(null, token)}
          tryAgain={tryAgain.bind(null, token)}
          notify={pushOn() ? <NotifyControl who="rose" token={token} publicKey={publicKey()} /> : undefined}
        />
        <Refresher />
      </main>
    </>
  );
}
