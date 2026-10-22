import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import { HomeView } from "./HomeView";

const count = (html: string, text: string) => html.split(text).length - 1;

it("sells KinCart and shows two still sample phones before a household starts", () => {
  const html = renderToStaticMarkup(<HomeView state={{}} />);

  expect(html).toContain("<span>Mom asks.</span> <span>You say OK.</span> <span>PayPal pays.</span>");
  expect(html).toContain("No more logging in as them or reading out card numbers.");
  expect(html).toContain(
    "reading out card numbers.</p><p>In a survey of 657 US adults, about 1 in 10 had signed in to someone else&#x27;s money or medical account with that person&#x27;s login.",
  );
  expect(html).toContain(
    '<a class="link" href="https://doi.org/10.2196/69806">Foong et al., Journal of Medical Internet Research, 2025.</a>',
  );
  expect(html).toContain("<strong>Sandbox money only.</strong> Nothing real is bought.");
  expect(html).toMatch(/>what&#x27;s real, what stands in, and what comes next\.<\/a><\/p>/);
  expect(html).toContain("Try KinCart");
  expect(html).toContain("First, link Rose&#x27;s sandbox PayPal on PayPal&#x27;s own page, or skip to a demo one.");
  expect(html).not.toContain("already linked");
  expect(html).toContain("<h2>How it works</h2>");
  expect(html).toContain("<strong>Your parent says what they need.</strong>");
  expect(html).toContain("<strong>AI finds real options.</strong>");
  expect(html).toContain("<strong>You say OK from your phone.</strong>");
  expect(html).toContain("<h2>You stay in charge</h2>");
  expect(html).toContain("<strong>Nothing is bought without your OK.</strong>");
  expect(html).toContain("<strong>You set the limits.</strong>");
  expect(html).toContain("<strong>No passwords change hands.</strong>");
  expect(count(html, "Sample, not live")).toBe(2);
  expect(count(html, '<div class="phone-screen" inert="">')).toBe(2);
  expect(html).toContain("Waiting for Sam");
  expect(html).toContain("OK, pay $9.99");
  expect(html).not.toContain("<iframe");
});

it("shows the household's two pages in lazy frames, and a button for each", () => {
  const html = renderToStaticMarkup(<HomeView state={{ links: { rose: "/r/rose-link", sam: "/h/sam-link" } }} />);

  expect(html).toMatch(/<iframe [^>]*src="\/r\/rose-link\?in=phone"[^>]*loading="lazy"/);
  expect(html).toMatch(/<iframe [^>]*src="\/h\/sam-link\?in=phone"[^>]*loading="lazy"/);
  expect(html).toMatch(/<a [^>]*href="\/r\/rose-link" target="_blank"[^>]*>Open Rose&#x27;s page<\/a>/);
  expect(html).toContain("Open Sam&#x27;s page");
  expect(html).toMatch(/<a [^>]*href="\/r\/rose-link" target="_blank"[^>]*>Be Rose<\/a>/);
  expect(html).toMatch(/<a [^>]*href="\/h\/sam-link" target="_blank"[^>]*>Be Sam<\/a>/);
  expect(html).toContain("Start a new one");
  expect(html).toMatch(/In a survey of 657 US adults, about 1 in 10 had signed in .*>Be Rose<\/a>/);
  expect(html).toContain('<a class="link" href="https://doi.org/10.2196/69806">');
  expect(html).toContain("Your Rose and Sam are in the two phones. Link Rose&#x27;s PayPal or skip it.");
  expect(html).not.toContain("on the right");
  expect(html).not.toContain("Try KinCart");
  expect(html).not.toContain("Sample");
});

it("says when Try KinCart works again after an address's 5 for the day, and that this browser's own still work", () => {
  const stopped = renderToStaticMarkup(<HomeView state={{ outcome: "limit", waitMinutes: 290 }} />);
  expect(stopped).toContain("That&#x27;s a lot of new Roses and Sams from here today. Try again in 5 hours.");
  expect(stopped).not.toContain("still work");

  const yours = renderToStaticMarkup(
    <HomeView state={{ links: { rose: "/r/rose-link", sam: "/h/sam-link" }, outcome: "limit", waitMinutes: 25 }} />,
  );
  expect(yours).toContain("Try again in 25 minutes. Your Rose and Sam still work.");
  expect(yours).toMatch(/<iframe [^>]*src="\/r\/rose-link\?in=phone"/);
});
