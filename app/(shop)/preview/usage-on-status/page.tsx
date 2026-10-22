import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import type { UsageResult } from "../../../../lib/status/usage";
import { StatusView } from "../../../status/StatusView";
import "../../../status/status.css";
import "../approve-and-pay/preview.css";

const database = { state: "ok", checkId: 812, checkedAt: new Date("2026-12-03T14:00:00Z") } as const;
const paypal = { state: "connected" } as const;

const dec3: UsageResult = {
  state: "ok",
  today: { finds: 38, searches: 214, stoppedFinds: 4, stoppedHouseholds: 1 },
  month: { finds: 96, searches: 540, stoppedFinds: 9, stoppedHouseholds: 2 },
};
const red: UsageResult = {
  state: "ok",
  today: { finds: 61, searches: 342, stoppedFinds: 27, stoppedHouseholds: 6 },
  month: { finds: 143, searches: 800, stoppedFinds: 31, stoppedHouseholds: 6 },
};
const zero = { finds: 0, searches: 0, stoppedFinds: 0, stoppedHouseholds: 0 };

// /status in each state the usage-on-status scenarios name.
export default function UsageOnStatusPreview() {
  if (process.env.VERCEL_ENV === "production") notFound();
  return (
    <main className="preview">
      <section className="preview-section">
        <h2>/status with the usage counts</h2>
        <div className="frames">
          <Frame label="14:00 UTC on Dec 3 (scenario 1)">
            <StatusView database={database} paypal={paypal} usage={dec3} build="5d67c17" />
          </Frame>
          <Frame label="800 of 1,000 searches this month (scenario 4)">
            <StatusView database={database} paypal={paypal} usage={red} build="5d67c17" />
          </Frame>
          <Frame label="00:05 UTC on Dec 1 (scenario 5)">
            <StatusView
              database={{ ...database, checkedAt: new Date("2026-12-01T00:05:00Z") }}
              paypal={paypal}
              usage={{ state: "ok", today: zero, month: zero }}
              build="5d67c17"
            />
          </Frame>
          <Frame label="The database stops answering (scenario 1)">
            <StatusView
              database={{ state: "not reachable", reason: "ETIMEDOUT" }}
              paypal={paypal}
              usage={{ state: "not reachable", reason: "ETIMEDOUT" }}
              build="5d67c17"
            />
          </Frame>
        </div>
      </section>
    </main>
  );
}

function Frame({ label, children }: { label: string; children: ReactNode }) {
  return (
    <figure className="frame">
      <figcaption>{label}</figcaption>
      {children}
    </figure>
  );
}
