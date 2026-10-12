import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import { StatusView } from "./StatusView";

it("shows both rails up and the build", () => {
  const html = renderToStaticMarkup(
    <StatusView
      database={{ state: "ok", checkId: 42, checkedAt: new Date("2026-10-12T14:03:11Z") }}
      paypal={{ state: "connected" }}
      build="a1b2c3d"
    />,
  );

  expect(html).toContain("<h1>Shop-together status</h1>");
  expect(html).toContain("<dt>Database</dt><dd>OK, check #42 at 14:03 UTC</dd>");
  expect(html).toContain("<dt>PayPal sandbox</dt><dd>connected</dd>");
  expect(html).toContain("<dt>Build</dt><dd><code>a1b2c3d</code></dd>");
});

it("shows the database as not reachable, in bold, without the error detail", () => {
  const html = renderToStaticMarkup(
    <StatusView
      database={{ state: "not reachable", reason: "ECONNREFUSED 127.0.0.1:1" }}
      paypal={{ state: "connected" }}
      build="a1b2c3d"
    />,
  );

  expect(html).toContain('<dt>Database</dt><dd class="fail">not reachable</dd>');
  expect(html).toContain("<dt>PayPal sandbox</dt><dd>connected</dd>");
  expect(html).not.toContain("ECONNREFUSED");
  expect(html).not.toContain("127.0.0.1");
});
