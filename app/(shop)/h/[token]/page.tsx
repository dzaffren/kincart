import type { Metadata } from "next";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { searchOn } from "../../../../lib/shop/find";
import { settleStuck } from "../../../../lib/shop/pay";
import { whoIs } from "../../../../lib/shop/people";
import { publicKey, pushOn } from "../../../../lib/shop/push";
import { minutesUntil } from "../../../../lib/shop/limits";
import { getLimit, getPasskey, getSearch, getTotal, latest } from "../../../../lib/shop/requests";
import { answer, findAnother, makeLinks, setLimit, setTotal } from "../../actions";
import { NotifyControl } from "../../NotifyControl";
import { PasskeyControl } from "../../PasskeyControl";
import { origin } from "../../origin";
import { sendPayment } from "../../pings";
import { Refresher } from "../../Refresher";
import { SamView, type Links } from "../../SamView";
import { samState } from "../../state";
import { PageHead } from "../../ui";

// The Home Screen icon opens this person's own link, not the site's front page (D28).
export async function generateMetadata({ params }: PageProps<"/h/[token]">): Promise<Metadata> {
  const { token } = await params;
  return { manifest: `/manifest/${token}`, appleWebApp: { capable: true, title: "KinCart" } };
}

export default async function SamPage({ params, searchParams }: PageProps<"/h/[token]">) {
  await connection();
  const { token } = await params;
  const who = await whoIs(token);
  if (who?.person !== "sam") notFound();
  const { household } = who;

  const query = await searchParams;

  const settled = await settleStuck(household);
  if (settled) sendPayment(settled.result, settled.request);
  const on = searchOn();
  // Rose's search, for Sam's Find another after a No or an untick (D113).
  const [request, limitCents, totalCents, saved, passkey] = await Promise.all([
    latest(household),
    on ? getLimit(household) : null,
    on ? getTotal(household) : null,
    on ? getSearch(household) : undefined,
    household === 1 ? null : getPasskey(household),
  ]);
  const limit =
    limitCents === null
      ? undefined
      : { cents: limitCents, saved: query.limit === "saved", error: query.limit === "invalid" };
  const total = on ? { cents: totalCents, saved: query.total === "saved", error: query.total === "invalid" } : undefined;
  const state = samState(
    request,
    limitCents ?? undefined,
    saved,
    query.find === "limit" ? minutesUntil(Number(query.until)) : undefined,
  );
  // New links shows only on Sam's own page, with no ask to answer, and never for household 1, whose links
  // live in Vercel's env (D45, D52). Rose's new link stays for 10 minutes in a cookie (D121).
  const newRose = (await cookies()).get("new_rose")?.value;
  const links: Links | undefined =
    household === 1 || query.in === "phone" || state.kind === "request"
      ? undefined
      : query.links === "new"
        ? { kind: "confirm" }
        : newRose
          ? { kind: "made", roseLink: `${await origin()}/r/${newRose}` }
          : { kind: "offer" };

  // Confirm each OK shows only on Sam's own page, never for household 1. Inside the home page's phones, an OK
  // with the passkey on opens Sam's own page in a new tab (D122, D125).
  const inPhone = query.in === "phone";
  const refused = query.refused === "ok" || query.refused === "links" ? query.refused : undefined;

  return (
    <>
      <PageHead />
      <main>
        <SamView
          state={state}
          answer={request ? answer.bind(null, token, request.id) : undefined}
          limit={limit}
          setLimit={setLimit.bind(null, token)}
          total={total}
          setTotal={setTotal.bind(null, token)}
          findAnother={findAnother.bind(null, token)}
          notify={pushOn() ? <NotifyControl who="sam" token={token} publicKey={publicKey()} /> : undefined}
          links={links}
          makeLinks={makeLinks.bind(null, token)}
          passkey={household === 1 || inPhone ? undefined : <PasskeyControl token={token} on={!!passkey} />}
          refused={refused}
          inPhone={inPhone}
          guard={passkey && !inPhone ? token : undefined}
          okInTab={passkey && inPhone ? `/h/${token}` : undefined}
        />
        <Refresher />
      </main>
    </>
  );
}
