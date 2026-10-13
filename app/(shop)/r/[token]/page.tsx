import { notFound } from "next/navigation";
import { connection } from "next/server";
import { ITEMS } from "../../../../lib/shop/items";
import { settleStuck } from "../../../../lib/shop/pay";
import { whoIs } from "../../../../lib/shop/people";
import { getVault, latest } from "../../../../lib/shop/requests";
import { askSam, startLink } from "../../actions";
import { Refresher } from "../../Refresher";
import { RoseView } from "../../RoseView";
import { roseState } from "../../state";

export default async function RosePage({ params, searchParams }: PageProps<"/r/[token]">) {
  await connection();
  const { token } = await params;
  if (whoIs(token) !== "rose") notFound();
  const query = await searchParams;

  await settleStuck();
  const [vault, request] = await Promise.all([getVault(), latest()]);
  const state = roseState(vault, request, {
    cancelled: query.cancelled === "1",
    pickMissing: query.pick === "missing",
    askAgain: query.ask === "1",
  });

  return (
    <main>
      <RoseView state={state} items={ITEMS} link={startLink.bind(null, token)} ask={askSam.bind(null, token)} />
      <Refresher />
    </main>
  );
}
