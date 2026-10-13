import type { DatabaseResult } from "../../lib/status/database";
import type { PaypalResult } from "../../lib/status/paypal";

type Props = {
  database: DatabaseResult;
  paypal: PaypalResult;
  build: string;
};

export function StatusView({ database, paypal, build }: Props) {
  return (
    <main className="status">
      <h1>Shop-together status</h1>
      <dl>
        <dt>Database</dt>
        <dd className={database.state === "ok" ? undefined : "fail"}>{databaseText(database)}</dd>
        <dt>PayPal sandbox</dt>
        <dd className={paypal.state === "connected" ? undefined : "fail"}>{paypal.state}</dd>
        <dt>Build</dt>
        <dd>
          <code>{build}</code>
        </dd>
      </dl>
    </main>
  );
}

function databaseText(result: DatabaseResult): string {
  if (result.state !== "ok") return result.state;
  const time = result.checkedAt.toISOString().slice(11, 16);
  return `OK, check #${result.checkId} at ${time} UTC`;
}
