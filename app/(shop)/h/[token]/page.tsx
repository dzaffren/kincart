import { notFound } from "next/navigation";
import { connection } from "next/server";
import { settleStuck } from "../../../../lib/shop/pay";
import { whoIs } from "../../../../lib/shop/people";
import { latest } from "../../../../lib/shop/requests";
import { answer } from "../../actions";
import { Refresher } from "../../Refresher";
import { SamView } from "../../SamView";
import { samState } from "../../state";

export default async function SamPage({ params }: PageProps<"/h/[token]">) {
  await connection();
  const { token } = await params;
  if (whoIs(token) !== "sam") notFound();

  await settleStuck();
  const request = await latest();

  return (
    <main>
      <SamView state={samState(request)} answer={request ? answer.bind(null, token, request.id) : undefined} />
      <Refresher />
    </main>
  );
}
