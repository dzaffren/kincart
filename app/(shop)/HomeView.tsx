import { Button } from "./Button";
import { HELPER, Notice, RELATIVE } from "./ui";

type Action = (formData: FormData) => void | Promise<void>;

// ready: the first start in this browser; fresh: a new one in place of an old one.
export type HomeState = {
  links?: { rose: string; sam: string };
  outcome?: "ready" | "fresh" | "failed";
  busy?: boolean;
};

export function HomeView({ state, start }: { state: HomeState; start?: Action }) {
  const { links, outcome, busy } = state;
  return (
    <div className="screen">
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
      <div className="heading">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="home-mark" src="/icon.svg" alt="" />
        <h1>KinCart</h1>
        <p className="lead">An older shopper buys online with a relative&apos;s OK, and no shared passwords.</p>
      </div>
      <p>
        <strong>Sandbox money only.</strong> Nothing real is bought.
      </p>
      {links ? (
        <>
          <div className="stack">
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
              Want a clean start? A new {RELATIVE} and {HELPER} have nothing asked and no limits. Your old links keep
              working.
            </p>
            <Button type="submit" kind="secondary" busy={busy} busyLabel="Starting…">
              Start a new one
            </Button>
          </form>
        </>
      ) : (
        <form className="stack" action={start}>
          <p>
            You get your own {RELATIVE}, who asks for things, and {HELPER}, who says OK. {RELATIVE}&apos;s sandbox
            PayPal is already linked.
          </p>
          <Button type="submit" busy={busy} busyLabel="Starting…">
            Try KinCart
          </Button>
        </form>
      )}
      <a className="link" href="/status">
        System status
      </a>
    </div>
  );
}
