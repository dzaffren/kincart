import { Fragment, type ReactNode } from "react";
import type { DatabaseResult } from "../../lib/status/database";
import type { PaypalResult } from "../../lib/status/paypal";
import { SEARCHES_A_MONTH, SEARCHES_RED, type Counts, type UsageResult } from "../../lib/status/usage";

type Props = {
  database: DatabaseResult;
  paypal: PaypalResult;
  usage?: UsageResult;
  build: string;
};

const counts: [keyof Counts, string][] = [
  ["finds", "Finds"],
  ["searches", "Channel3 searches"],
  ["stoppedFinds", "Stopped Finds"],
  ["stoppedHouseholds", "Stopped Try KinCarts"],
];

export function StatusView({ database, paypal, usage, build }: Props) {
  return (
    <main className="status">
      <header className="status-head">
        <div className="screen">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="brand-mark" src="/icon.svg" alt="" />
          <h1>KinCart status</h1>
        </div>
      </header>
      <div className="screen">
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
        {usage && (
          <section className="stack">
            <div className="heading">
              <h2>Usage</h2>
              <p className="small">Today and this month, in UTC.</p>
            </div>
            <dl>
              {counts.map(([count, label]) => (
                <Fragment key={count}>
                  <dt>{label}</dt>
                  <dd className={usage.state === "ok" ? undefined : "fail"}>{usageLines(usage, count)}</dd>
                </Fragment>
              ))}
            </dl>
          </section>
        )}
      </div>
    </main>
  );
}

function databaseText(result: DatabaseResult): string {
  if (result.state !== "ok") return result.state;
  const time = result.checkedAt.toISOString().slice(11, 16);
  return `OK, check #${result.checkId} at ${time} UTC`;
}

function usageLines(usage: UsageResult, count: keyof Counts): ReactNode {
  if (usage.state !== "ok") return usage.state;
  const month = count === "searches" ? `${number(usage.month.searches)} of ${number(SEARCHES_A_MONTH)}` : number(usage.month[count]);
  return (
    <>
      <span>{number(usage.today[count])} today</span>
      <span className={count === "searches" && usage.month.searches >= SEARCHES_RED ? "fail" : undefined}>
        {month} this month
      </span>
    </>
  );
}

function number(value: number): string {
  return value.toLocaleString("en-US");
}
