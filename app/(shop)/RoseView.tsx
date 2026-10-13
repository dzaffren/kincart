import { useId } from "react";
import type { Item } from "../../lib/shop/items";
import { Button } from "./Button";
import { LocalTime } from "./LocalTime";
import { HELPER, ItemPicker, Notice, ReceiptCard, Summary, type Receipt } from "./ui";

export type RoseState =
  | { kind: "not linked"; cancelled?: boolean; busy?: boolean }
  | {
      kind: "pick";
      outcome?: { kind: "declined" | "failed"; item: Item };
      picked?: string;
      error?: boolean;
      busy?: boolean;
    }
  | { kind: "waiting"; item: Item; askedAt: Date }
  | { kind: "paid"; receipt: Receipt };

type Action = (formData: FormData) => void | Promise<void>;

type Props = { state: RoseState; items: Item[]; link?: Action; ask?: Action };

export function RoseView({ state, items, link, ask }: Props) {
  const headingId = useId();

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
        <Summary title={state.item.name} cents={state.item.cents} />
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
      {state.outcome?.kind === "declined" && (
        <Notice tone="neutral">
          {HELPER} said no to {state.outcome.item.name}.
        </Notice>
      )}
      {state.outcome?.kind === "failed" && (
        <Notice tone="danger">Payment didn&apos;t go through. Nothing was taken.</Notice>
      )}
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
