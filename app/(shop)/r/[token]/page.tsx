import { notFound } from "next/navigation";
import { connection } from "next/server";
import { searchOn } from "../../../../lib/shop/find";
import { ITEMS } from "../../../../lib/shop/items";
import { settleStuck } from "../../../../lib/shop/pay";
import { whoIs } from "../../../../lib/shop/people";
import { getLimit, getSearch, getVault, latest } from "../../../../lib/shop/requests";
import { askSam, find, startLink, tryAgain } from "../../actions";
import { Refresher } from "../../Refresher";
import { RoseView } from "../../RoseView";
import { roseState } from "../../state";

// Find waits on Haiku and Channel3: about 10 s in the spike.
export const maxDuration = 30;

export default async function RosePage({ params, searchParams }: PageProps<"/r/[token]">) {
  await connection();
  const { token } = await params;
  if (whoIs(token) !== "rose") notFound();
  const query = await searchParams;

  await settleStuck();
  const on = searchOn();
  const [vault, request, saved, limitCents] = await Promise.all([
    getVault(),
    latest(),
    on ? getSearch() : null,
    on ? getLimit() : 0,
  ]);
  const state = roseState(
    vault,
    request,
    {
      cancelled: query.cancelled === "1",
      pickMissing: query.pick === "missing",
      askAgain: query.ask === "1",
      emptyFind: query.find === "empty",
    },
    on ? { saved, limitCents } : undefined,
  );

  return (
    <main>
      <RoseView
        state={state}
        items={ITEMS}
        link={startLink.bind(null, token)}
        ask={askSam.bind(null, token)}
        find={find.bind(null, token)}
        tryAgain={tryAgain.bind(null, token)}
      />
      <Refresher />
    </main>
  );
}
