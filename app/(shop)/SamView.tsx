import { Button, money, Notice, ReceiptCard, RELATIVE, Summary, time, type Item, type Receipt } from "./ui";

export type SamState =
  | { kind: "nothing"; declined?: Item }
  | { kind: "request"; item: Item; askedAt: Date; busy?: boolean }
  | { kind: "paid"; receipt: Receipt }
  | { kind: "failed"; item: Item };

export function SamView({ state }: { state: SamState }) {
  if (state.kind === "request") {
    return (
      <div className="screen">
        <h1>
          {RELATIVE} would like {state.item.name}
        </h1>
        <Summary cents={state.item.cents} note={`Paid from ${RELATIVE}'s PayPal if you say OK.`} />
        <p className="small">Asked at {time(state.askedAt)}.</p>
        <form className="stack">
          {state.busy ? (
            <Button type="submit" busy="Paying…" />
          ) : (
            <>
              <Button type="submit" name="answer" value="ok">
                OK, pay {money(state.item.cents)}
              </Button>
              <Button type="submit" name="answer" value="no" kind="secondary">
                No
              </Button>
            </>
          )}
        </form>
      </div>
    );
  }

  if (state.kind === "paid") {
    return (
      <div className="screen">
        <h1>Paid from {RELATIVE}&apos;s PayPal</h1>
        <ReceiptCard receipt={state.receipt} />
        <p className="small">{RELATIVE} sees this receipt too.</p>
      </div>
    );
  }

  if (state.kind === "failed") {
    return (
      <div className="screen">
        <h1>Payment didn&apos;t go through</h1>
        <Notice tone="danger">
          Nothing was taken from {RELATIVE}&apos;s PayPal for {state.item.name}. {RELATIVE} can ask again.
        </Notice>
      </div>
    );
  }

  return (
    <div className="screen">
      {state.declined && (
        <Notice tone="neutral">
          You said no to {state.declined.name}. {RELATIVE} can see that.
        </Notice>
      )}
      <div className="heading">
        <h1>Nothing to approve</h1>
        <p className="lead">When {RELATIVE} asks for something, it shows up here. Keep this page open.</p>
      </div>
    </div>
  );
}
