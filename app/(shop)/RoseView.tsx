import { useId } from "react";
import type { Item } from "../../lib/shop/items";
import { Button } from "./Button";
import { LocalTime } from "./LocalTime";
import {
  HELPER,
  ItemPicker,
  ListingPicker,
  Notice,
  ReceiptCard,
  Summary,
  type Listing,
  type Receipt,
  wholeDollars,
} from "./ui";

type Outcome = { kind: "declined" | "failed"; item: Item };

export type RoseState =
  | { kind: "not linked"; cancelled?: boolean; busy?: boolean }
  | {
      kind: "pick";
      outcome?: Outcome;
      picked?: string;
      error?: boolean;
      busy?: boolean;
    }
  | {
      kind: "ask";
      limitCents: number;
      words?: string;
      outcome?: Outcome;
      problem?: "empty" | "nothing found" | "over limit";
      busy?: boolean;
    }
  | {
      kind: "options";
      limitCents: number;
      words: string;
      listings: Listing[];
      picked?: string;
      error?: boolean;
      busy?: boolean;
    }
  | { kind: "waiting"; item: Item; askedAt: Date; shop?: string }
  | { kind: "paid"; receipt: Receipt };

type Action = (formData: FormData) => void | Promise<void>;

type Props = { state: RoseState; items: Item[]; link?: Action; ask?: Action; find?: Action };

export function RoseView({ state, items, link, ask, find }: Props) {
  const headingId = useId();
  const hintId = useId();
  const errorId = useId();

  if (state.kind === "not linked") {
    return (
      <div className="screen">
        <div className="heading">
          <h1>{state.cancelled ? "PayPal isn't linked yet" : "Link your PayPal to start"}</h1>
          <p className="lead">
            {state.cancelled
              ? "Nothing was saved. Link it when you're ready. You only do this once."
              : `You do this once. After that, you pick what you need, ${HELPER} says OK, and your PayPal pays. No passwords to share.`}
          </p>
        </div>
        <form action={link}>
          <Button type="submit" busy={state.busy} busyLabel="Opening PayPal…">
            Link PayPal
          </Button>
        </form>
      </div>
    );
  }

  if (state.kind === "waiting") {
    return (
      <div className="screen">
        <h1>Waiting for {HELPER}</h1>
        <Notice tone="wait">
          Asked at <LocalTime at={state.askedAt} format="clock" />. This page changes by itself when {HELPER}{" "}
          answers.
        </Notice>
        <Summary title={state.item.name} cents={state.item.cents} note={state.shop && `From ${state.shop}`} />
      </div>
    );
  }

  if (state.kind === "ask") {
    const limit = wholeDollars(state.limitCents);
    return (
      <div className="screen">
        <OutcomeNotice outcome={state.outcome} />
        {state.problem === "nothing found" && (
          <Notice tone="neutral">Couldn&apos;t find that. Try different words.</Notice>
        )}
        {state.problem === "over limit" && (
          <Notice tone="neutral">
            Nothing under {limit} for that. Try different words, or ask {HELPER} to raise the limit.
          </Notice>
        )}
        <div className="heading">
          <h1 id={headingId}>What do you need?</h1>
          <p className="small" id={hintId}>
            Say it the way you&apos;d tell {HELPER}. For example: warm slippers that are easy to put on, size 8.
          </p>
        </div>
        <form className="stack" action={find}>
          <div className="stack field">
            <textarea
              className="field-input"
              name="words"
              rows={3}
              defaultValue={state.words}
              readOnly={state.busy}
              aria-labelledby={headingId}
              aria-describedby={state.problem === "empty" ? `${hintId} ${errorId}` : hintId}
              aria-invalid={state.problem === "empty" || undefined}
            />
            {state.problem === "empty" && (
              <p className="field-error" id={errorId}>
                Type what you need first.
              </p>
            )}
          </div>
          <Button type="submit" busy={state.busy} busyLabel="Looking…">
            Find
          </Button>
        </form>
        <p className="small">
          {HELPER}&apos;s limit is {limit} an item. Nothing is paid until {HELPER} says OK.
        </p>
      </div>
    );
  }

  if (state.kind === "options") {
    return (
      <div className="screen">
        <div className="heading">
          <h1 id={headingId}>Which one would you like?</h1>
          <p className="small">
            For &ldquo;{state.words}&rdquo;
            {state.listings.length < 3 &&
              `. Only ${state.listings.length} found at ${wholeDollars(state.limitCents)} or less`}
            .
          </p>
        </div>
        <form className="stack" action={ask}>
          <ListingPicker
            listings={state.listings}
            labelledBy={headingId}
            picked={state.picked}
            error={state.error}
          />
          <Button type="submit" busy={state.busy} busyLabel={`Asking ${HELPER}…`}>
            Ask {HELPER}
          </Button>
        </form>
        {!state.busy && (
          <a className="button button-secondary" href="?">
            Try other words
          </a>
        )}
      </div>
    );
  }

  if (state.kind === "paid") {
    return (
      <div className="screen">
        <h1>{HELPER} said OK. It&apos;s paid.</h1>
        <ReceiptCard receipt={state.receipt} />
        <a className="button button-secondary" href="?ask=1">
          Ask for something else
        </a>
      </div>
    );
  }

  return (
    <div className="screen">
      <OutcomeNotice outcome={state.outcome} />
      <div className="heading">
        <h1 id={headingId}>What would you like?</h1>
        <p className="small">PayPal linked. Nothing is paid until {HELPER} says OK.</p>
      </div>
      <form className="stack" action={ask}>
        <ItemPicker items={items} labelledBy={headingId} picked={state.picked} error={state.error} />
        <Button type="submit" busy={state.busy} busyLabel={`Asking ${HELPER}…`}>
          Ask {HELPER}
        </Button>
      </form>
    </div>
  );
}

function OutcomeNotice({ outcome }: { outcome?: Outcome }) {
  if (outcome?.kind === "declined") {
    return (
      <Notice tone="neutral">
        {HELPER} said no to {outcome.item.name}.
      </Notice>
    );
  }
  if (outcome?.kind === "failed") {
    return <Notice tone="danger">Payment didn&apos;t go through. Nothing was taken.</Notice>;
  }
  return null;
}
