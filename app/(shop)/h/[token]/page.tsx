import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { searchOn } from "../../../../lib/shop/find";
import { settleStuck } from "../../../../lib/shop/pay";
import { whoIs } from "../../../../lib/shop/people";
import { publicKey, pushOn } from "../../../../lib/shop/push";
import { getLimit, latest } from "../../../../lib/shop/requests";
import { answer, setLimit } from "../../actions";
import { NotifyControl } from "../../NotifyControl";
import { Refresher } from "../../Refresher";
import { SamView } from "../../SamView";
import { samState } from "../../state";

// The Home Screen icon opens this person's own link, not the site's front page (D28).
export async function generateMetadata({ params }: PageProps<"/h/[token]">): Promise<Metadata> {
  const { token } = await params;
  return { manifest: `/manifest/${token}`, appleWebApp: { capable: true, title: "KinCart" } };
}

export default async function SamPage({ params, searchParams }: PageProps<"/h/[token]">) {
  await connection();
  const { token } = await params;
  if (whoIs(token) !== "sam") notFound();

  const query = await searchParams;

  await settleStuck();
  const [request, limitCents] = await Promise.all([latest(), searchOn() ? getLimit() : null]);
  const limit =
    limitCents === null
      ? undefined
      : { cents: limitCents, saved: query.limit === "saved", error: query.limit === "invalid" };

  return (
    <main>
      <SamView
        state={samState(request)}
        answer={request ? answer.bind(null, token, request.id) : undefined}
        limit={limit}
        setLimit={setLimit.bind(null, token)}
        notify={pushOn() ? <NotifyControl who="sam" token={token} publicKey={publicKey()} /> : undefined}
      />
      <Refresher />
    </main>
  );
}
