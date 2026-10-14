import { Button } from "./Button";
import { HELPER, Notice, PhoneFrame, RELATIVE } from "./ui";

type Action = (formData: FormData) => void | Promise<void>;

export type HomeState = { outcome?: "done" | "paying"; busy?: boolean };

type Props = { state: HomeState; rose: string; sam: string; startOver?: Action };

export function HomeView({ state, rose, sam, startOver }: Props) {
  return (
    <div className="home">
      <div className="screen home-intro">
        {state.outcome === "done" && (
          <Notice tone="neutral">
            Done. {RELATIVE} and {HELPER} are back to a clean start.
          </Notice>
        )}
        {state.outcome === "paying" && (
          <Notice tone="wait">A payment is going through. Try again in a few seconds.</Notice>
        )}
        <div className="heading">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="home-mark" src="/icon.svg" alt="" />
          <h1>KinCart</h1>
          <p className="lead">An older shopper buys online with a relative&apos;s OK, and no shared passwords.</p>
        </div>
        <p>
          {RELATIVE} says what they need. AI finds real listings and explains each one. {HELPER} taps OK on their own
          phone, and {RELATIVE}&apos;s saved PayPal pays.
        </p>
        <p>
          <strong>Sandbox money only.</strong> Nothing real is bought.
        </p>
        <div className="stack home-ways">
          <a className="button button-primary" href={rose} target="_blank" rel="noopener">
            Be {RELATIVE}
          </a>
          <a className="button button-secondary" href={sam} target="_blank" rel="noopener">
            Be {HELPER}
          </a>
        </div>
        <form className="stack home-reset" action={startOver}>
          <p className="small">
            Someone may have tried it before you. Start over clears their asks, limits and phones. {RELATIVE}&apos;s
            PayPal stays linked.
          </p>
          <Button type="submit" kind="secondary" busy={state.busy} busyLabel="Starting over…">
            Start over
          </Button>
        </form>
        <a className="link" href="/status">
          System status
        </a>
      </div>
      <div className="home-phones">
        <PhoneFrame who={RELATIVE} href={rose} />
        <PhoneFrame who={HELPER} href={sam} />
      </div>
    </div>
  );
}
