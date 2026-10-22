import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import type { UsageResult } from "../../lib/status/usage";
import { StatusView } from "./StatusView";

const usage: UsageResult = {
  state: "ok",
  today: { finds: 38, searches: 214, stoppedFinds: 4, stoppedHouseholds: 1 },
  month: { finds: 96, searches: 540, stoppedFinds: 9, stoppedHouseholds: 2 },
};

it("shows both rails up and the build", () => {
  const html = renderToStaticMarkup(
    <StatusView
      database={{ state: "ok", checkId: 42, checkedAt: new Date("2026-10-12T14:03:11Z") }}
      paypal={{ state: "connected" }}
      usage={usage}
      build="a1b2c3d"
    />,
  );

  expect(html).toContain("<h1>KinCart status</h1>");
  expect(html).toContain("<dt>Database</dt><dd>OK, check #42 at 14:03 UTC</dd>");
  expect(html).toContain("<dt>PayPal sandbox</dt><dd>connected</dd>");
  expect(html).toContain("<dt>Build</dt><dd><code>a1b2c3d</code></dd>");
});

it("shows the database as not reachable, in bold, without the error detail", () => {
  const html = renderToStaticMarkup(
    <StatusView
      database={{ state: "not reachable", reason: "ECONNREFUSED 127.0.0.1:1" }}
      paypal={{ state: "connected" }}
      usage={usage}
      build="a1b2c3d"
    />,
  );

  expect(html).toContain('<dt>Database</dt><dd class="fail">not reachable</dd>');
  expect(html).toContain("<dt>PayPal sandbox</dt><dd>connected</dd>");
  expect(html).not.toContain("ECONNREFUSED");
  expect(html).not.toContain("127.0.0.1");
});

it.each([
  ["not configured", { state: "not configured" }],
  ["keys rejected", { state: "keys rejected" }],
  ["not reachable", { state: "not reachable", reason: "HTTP 500" }],
] as const)("shows PayPal as %s, in bold, without the error detail", (text, paypal) => {
  const html = renderToStaticMarkup(
    <StatusView
      database={{ state: "ok", checkId: 44, checkedAt: new Date("2026-10-12T14:06:00Z") }}
      paypal={paypal}
      usage={usage}
      build="a1b2c3d"
    />,
  );

  expect(html).toContain(`<dt>PayPal sandbox</dt><dd class="fail">${text}</dd>`);
  expect(html).toContain("<dt>Database</dt><dd>OK, check #44 at 14:06 UTC</dd>");
  expect(html).not.toContain("HTTP 500");
});

it("shows today's and this month's counts in UTC, with the month's searches against 1,000", () => {
  const html = renderToStaticMarkup(
    <StatusView database={{ state: "not configured" }} paypal={{ state: "connected" }} usage={usage} build="a1b2c3d" />,
  );

  expect(html).toContain("<h2>Usage</h2>");
  expect(html).toContain("Today and this month, in UTC.");
  expect(html).toContain("<dt>Finds</dt><dd><span>38 today</span><span>96 this month</span></dd>");
  expect(html).toContain("<dt>Channel3 searches</dt><dd><span>214 today</span><span>540 of 1,000 this month</span></dd>");
  expect(html).toContain("<dt>Stopped Finds</dt><dd><span>4 today</span><span>9 this month</span></dd>");
  expect(html).toContain("<dt>Stopped Try KinCarts</dt><dd><span>1 today</span><span>2 this month</span></dd>");
});

it("turns only the month's searches bold red, from 800", () => {
  const at = (searches: number) =>
    renderToStaticMarkup(
      <StatusView
        database={{ state: "not configured" }}
        paypal={{ state: "connected" }}
        usage={{ ...usage, today: { ...usage.today, searches: 342 }, month: { ...usage.month, searches } }}
        build="a1b2c3d"
      />,
    );

  expect(at(799)).toContain("<dd><span>342 today</span><span>799 of 1,000 this month</span></dd>");
  expect(at(800)).toContain('<dd><span>342 today</span><span class="fail">800 of 1,000 this month</span></dd>');
});

it.each([
  ["not reachable", { state: "not reachable", reason: "ETIMEDOUT" }],
  ["not configured", { state: "not configured" }],
] as const)("says %s on each count line, in bold, without the error detail", (text, result) => {
  const html = renderToStaticMarkup(
    <StatusView database={{ state: "not configured" }} paypal={{ state: "connected" }} usage={result} build="a1b2c3d" />,
  );

  for (const label of ["Finds", "Channel3 searches", "Stopped Finds", "Stopped Try KinCarts"]) {
    expect(html).toContain(`<dt>${label}</dt><dd class="fail">${text}</dd>`);
  }
  expect(html).toContain("<dt>PayPal sandbox</dt><dd>connected</dd>");
  expect(html).not.toContain("ETIMEDOUT");
});
