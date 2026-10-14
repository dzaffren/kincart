import { Button } from "./Button";
import { RoseView } from "./RoseView";
import { SamView } from "./SamView";
import { HELPER, Notice, PhoneFrame, RELATIVE } from "./ui";

type Action = (formData: FormData) => void | Promise<void>;

// ready: the first start in this browser; fresh: a new one in place of an old one.
export type HomeState = {
  links?: { rose: string; sam: string };
  outcome?: "ready" | "fresh" | "failed";
  busy?: boolean;
};

// The two showcase directions on trial; the one not chosen goes.
export type HomeLook = "apple" | "monzo";

// Before a household starts, the phones show this ask as a still sample.
const batteries = { id: "aa-24", name: "Amazon Basics 24-Pack AA Alkaline Batteries", cents: 999 };
const askedAt = new Date("2026-12-03T10:15:00");
const found = {
  shop: "amazon.com",
  url: "https://www.amazon.com/",
  reason: "Enough for the remotes and clocks for a long while.",
};

type Props = { state: HomeState; start?: Action; look?: HomeLook };

export function HomeView({ state, start, look = "apple" }: Props) {
  const { links, outcome, busy } = state;

  const notices = (
    <>
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
      {outcome === "failed" && (
        <Notice tone="danger">
          Your {RELATIVE} and {HELPER} didn&apos;t start. Nothing was saved. Try again in a moment.
        </Notice>
      )}
    </>
  );
  const explain = (
    <p>
      {RELATIVE} says what they need. AI finds real listings and explains each one. {HELPER} taps OK on their own
      phone, and {RELATIVE}&apos;s saved PayPal pays. Nobody shares a password.
    </p>
  );
  const sandbox = (
    <p>
      <strong>Sandbox money only.</strong> Nothing real is bought.
    </p>
  );
  const tryIt = !links && (
    <form className="stack" action={start}>
      <p>
        You get your own {RELATIVE} and {HELPER} to try. {RELATIVE}&apos;s sandbox PayPal is already linked.
      </p>
      <Button type="submit" busy={busy} busyLabel="Starting…">
        Try KinCart
      </Button>
    </form>
  );
  const ways = links && (
    <div className="stack home-ways">
      <p className="small">Each opens in a new tab. Come back here to open them again.</p>
      <a className="button button-primary" href={links.rose} target="_blank" rel="noopener">
        Be {RELATIVE}
      </a>
      <a className="button button-secondary" href={links.sam} target="_blank" rel="noopener">
        Be {HELPER}
      </a>
    </div>
  );
  const startNew = links && (
    <form className="stack" action={start}>
      <p className="small">
        Want a clean start? A new {RELATIVE} and {HELPER} have nothing asked and no limits. Your old links keep
        working.
      </p>
      <Button type="submit" kind="secondary" busy={busy} busyLabel="Starting…">
        Start a new one
      </Button>
    </form>
  );
  const status = (
    <a className="link" href="/status">
      System status
    </a>
  );
  const phones = (
    <div className="home-stage">
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
  );

  if (look === "monzo") {
    return (
      <div className="home home-monzo">
        <div className="screen home-hero">
          {notices}
          <div className="home-head home-reveal">
            <p className="home-brand">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img className="home-mark" src="/icon.svg" alt="" />
              KinCart
            </p>
            <h1 className="home-display">
              <span>{RELATIVE} asks.</span> <span>{HELPER} says OK.</span> <span>PayPal pays.</span>
            </h1>
          </div>
          <div className="home-body home-reveal home-reveal-2">
            <p>
              {RELATIVE} is an older shopper, and {HELPER} is family. AI finds real listings and explains each one, and{" "}
              {HELPER} taps OK on their own phone. Nobody shares a password.
            </p>
            {sandbox}
            {tryIt}
            {ways}
            {startNew}
            {status}
          </div>
        </div>
        {phones}
      </div>
    );
  }

  return (
    <div className="home home-apple">
      <div className="screen home-hero">
        {notices}
        <div className="home-head home-reveal">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="home-mark" src="/icon.svg" alt="" />
          <h1 className="home-display">KinCart</h1>
          <p className="home-lede">Shop online. Family says OK.</p>
        </div>
        <div className="home-body home-reveal home-reveal-2">
          {sandbox}
          {tryIt}
          {ways}
        </div>
      </div>
      {phones}
      <div className="screen home-more">
        {explain}
        {startNew}
        {status}
      </div>
    </div>
  );
}
