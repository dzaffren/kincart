import { Button } from "./Button";
import { RoseView } from "./RoseView";
import { SamView } from "./SamView";
import { HELPER, Notice, PhoneFrame, RELATIVE, waitFor } from "./ui";

type Action = (formData: FormData) => void | Promise<void>;

// ready: the first start in this browser; fresh: a new one in place of an old one; limit: this
// address started its 5 for the day, and waitMinutes says when the oldest drops out.
export type HomeState = {
  links?: { rose: string; sam: string };
  outcome?: "ready" | "fresh" | "failed" | "limit";
  waitMinutes?: number;
  busy?: boolean;
};

// Before a household starts, the phones show this ask as a still sample.
const batteries = { id: "aa-24", name: "Amazon Basics 24-Pack AA Alkaline Batteries", cents: 999 };
const askedAt = new Date("2026-12-03T10:15:00");
const found = {
  shop: "amazon.com",
  url: "https://www.amazon.com/",
  reason: "Enough for the remotes and clocks for a long while.",
};

export function HomeView({ state, start }: { state: HomeState; start?: Action }) {
  const { links, outcome, waitMinutes, busy } = state;
  return (
    <>
      <div className="home">
        <div className="screen home-hero">
          {outcome === "ready" && (
            <Notice tone="neutral">
              Your {RELATIVE} and {HELPER} are ready.
            </Notice>
          )}
          {outcome === "fresh" && (
            <Notice tone="neutral">
              Your new {RELATIVE} and {HELPER} are ready. Tabs you already have open still show the old ones.
            </Notice>
          )}
          {outcome === "limit" && (
            <Notice tone="neutral">
              That&apos;s a lot of new {RELATIVE}s and {HELPER}s from here today. Try again in{" "}
              {waitFor(waitMinutes ?? 0)}.{links && ` Your ${RELATIVE} and ${HELPER} still work.`}
            </Notice>
          )}
          {outcome === "failed" && (
            <Notice tone="danger">
              Your {RELATIVE} and {HELPER} didn&apos;t start. Nothing was saved. Try again in a moment.
            </Notice>
          )}
          <div className="home-head home-reveal">
            <p className="brand">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img className="brand-mark" src="/icon.svg" alt="" />
              KinCart
            </p>
            <h1 className="home-display">
              <span>Mom asks.</span> <span>You say OK.</span> <span>PayPal pays.</span>
            </h1>
          </div>
          <div className="home-body home-reveal home-reveal-2">
            <p>
              Your parent shops from their own phone, and you approve from yours. No more logging in as them or
              reading out card numbers.
            </p>
            <p>
              In a survey of 657 US adults, about 1 in 10 had signed in to someone else&apos;s money or medical account
              with that person&apos;s login.{" "}
              <a className="link" href="https://doi.org/10.2196/69806">
                Foong et al., Journal of Medical Internet Research, 2025.
              </a>
            </p>
            <p>
              <strong>Sandbox money only.</strong> Nothing real is bought. This is a hackathon build:{" "}
              <a className="link" href="https://github.com/dzaffren/kincart/blob/main/docs/ROADMAP.md">
                what&apos;s real, what stands in, and what comes next.
              </a>
            </p>
            {links ? (
              <>
                <p className="home-guide">
                  Your {RELATIVE} and {HELPER} are in the two phones. Link {RELATIVE}&apos;s PayPal or skip it. Then
                  ask for something as {RELATIVE}, and say OK as {HELPER}.
                </p>
                <div className="stack home-ways">
                  <p className="small">Each opens in a new tab. Come back here to open them again.</p>
                  <a className="button button-primary" href={links.rose} target="_blank" rel="noopener">
                    Be {RELATIVE}
                  </a>
                  <a className="button button-secondary" href={links.sam} target="_blank" rel="noopener">
                    Be {HELPER}
                  </a>
                </div>
                <form className="stack" action={start}>
                  <p className="small">
                    Want a clean start? A new {RELATIVE} and {HELPER} have nothing asked and no limits. Your old links
                    keep working.
                  </p>
                  <Button type="submit" kind="secondary" busy={busy} busyLabel="Starting…">
                    Start a new one
                  </Button>
                </form>
              </>
            ) : (
              <form className="stack" action={start}>
                <p>
                  Try both sides now, with no sign-up: {RELATIVE}, who asks, and {HELPER}, who says OK.{" "}
                  First, link {RELATIVE}&apos;s sandbox PayPal on PayPal&apos;s own page, or skip to a demo one.
                </p>
                <Button type="submit" busy={busy} busyLabel="Starting…">
                  Try KinCart
                </Button>
              </form>
            )}
          </div>
        </div>
        <div className="home-phones home-reveal home-reveal-3">
          {links ? (
            <>
              <PhoneFrame who={RELATIVE} href={links.rose} />
              <PhoneFrame who={HELPER} href={links.sam} />
            </>
          ) : (
            <>
              <PhoneFrame who={RELATIVE}>
                <RoseView state={{ kind: "waiting", item: batteries, askedAt, shop: found.shop }} items={[]} />
              </PhoneFrame>
              <PhoneFrame who={HELPER}>
                <SamView state={{ kind: "request", item: batteries, askedAt, found }} />
              </PhoneFrame>
            </>
          )}
        </div>
      </div>
      <div className="home-more">
        <section className="stack">
          <h2>How it works</h2>
          <ol className="home-steps">
            <li>
              <strong>Your parent says what they need.</strong> In their own words, typed or spoken: batteries, a
              night light, a phone charger.
            </li>
            <li>
              <strong>AI finds real options.</strong> Up to three listings for each thing, under your limit, each
              explained plainly: what it is, why it fits, and what to watch for.
            </li>
            <li>
              <strong>You say OK from your phone.</strong> Your phone buzzes with the ask. One tap pays with their
              saved PayPal, and you both get the receipt.
            </li>
          </ol>
        </section>
        <section className="stack">
          <h2>You stay in charge</h2>
          <ul className="home-points">
            <li>
              <strong>Nothing is bought without your OK.</strong> Untick anything you don&apos;t want, and it goes
              back to your parent.
            </li>
            <li>
              <strong>You set the limits.</strong> A price for each item, and a total for each ask.
            </li>
            <li>
              <strong>No passwords change hands.</strong> PayPal keeps the payment details, linked once from your
              parent&apos;s phone.
            </li>
          </ul>
        </section>
        <a className="link home-status" href="/status">
          System status
        </a>
      </div>
    </>
  );
}
