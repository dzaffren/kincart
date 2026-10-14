import { useId, type ReactNode } from "react";
import type { Item } from "../../lib/shop/items";
import type { Source } from "../../lib/shop/requests";
import { BasketAnswer } from "./BasketAnswer";
import { Button } from "./Button";
import { LocalTime } from "./LocalTime";
import { listed, money, Notice, ReceiptCard, RELATIVE, Summary, wholeDollars, type Line, type Receipt } from "./ui";

export type SamState =
  | { kind: "nothing"; declined?: Item; lines?: Line[] }
  | { kind: "request"; item: Item; askedAt: Date; busy?: boolean; found?: Source; lines?: Line[] }
  | { kind: "paid"; receipt: Receipt }
  | { kind: "failed"; item: Item; lines?: Line[] };

export type Limit = { cents: number; saved?: boolean; error?: boolean; busy?: boolean };

type Action = (formData: FormData) => void | Promise<void>;

type Props = { state: SamState; answer?: Action; limit?: Limit; setLimit?: Action; notify?: ReactNode };

export function SamView({ state, answer, limit, setLimit, notify }: Props) {
  if (state.kind === "request" && state.lines) {
    return (
      <div className="screen">
        <BasketAnswer lines={state.lines} askedAt={state.askedAt} answer={answer} busy={state.busy} />
      </div>
    );
  }

  if (state.kind === "request") {
    const { found } = state;
    return (
      <div className="screen">
        <h1>{found ? `${RELATIVE} would like this` : `${RELATIVE} would like ${state.item.name}`}</h1>
        <Summary
          title={found && state.item.name}
          cents={state.item.cents}
          note={`${found ? `From ${found.shop}. ` : ""}Paid from ${RELATIVE}'s PayPal if you say OK.`}
        />
        {found && (
          <div className="heading">
            <p>
              <strong>Why it fits:</strong> {found.reason}
            </p>
            <a className="link" href={found.url} target="_blank" rel="noopener noreferrer">
              See it on {found.shop}
            </a>
          </div>
        )}
        <p className="small">
          Asked at <LocalTime at={state.askedAt} format="clock" />.
        </p>
        <form className="stack" action={answer}>
          {state.busy ? (
            <Button type="submit" busy busyLabel="Paying…" />
          ) : (
            <>
              <Button type="submit" name="answer" value="ok" busyLabel="Paying…">
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

  return (
    <div className="screen">
      <SamOutcome state={state} />
      {notify}
      {limit && <LimitForm limit={limit} setLimit={setLimit} />}
    </div>
  );
}

function SamOutcome({ state }: { state: Exclude<SamState, { kind: "request" }> }) {
  if (state.kind === "paid") {
    return (
      <>
        <h1>Paid from {RELATIVE}&apos;s PayPal</h1>
        <ReceiptCard receipt={state.receipt} />
        {state.receipt.leftOut && (
          <Notice tone="neutral">
            You left out {listed(state.receipt.leftOut)}. {RELATIVE} can ask for{" "}
            {state.receipt.leftOut.length > 1 ? "them" : "it"} again.
          </Notice>
        )}
        <p className="small">{RELATIVE} sees this receipt too.</p>
      </>
    );
  }

  if (state.kind === "failed") {
    return (
      <>
        <h1>Payment didn&apos;t go through</h1>
        <Notice tone="danger">
          Nothing was taken from {RELATIVE}&apos;s PayPal for{" "}
          {state.lines ? `the ${state.lines.length} things` : state.item.name}. {RELATIVE} can ask again.
        </Notice>
      </>
    );
  }

  return (
    <>
      {state.declined && (
        <Notice tone="neutral">
          You said no to {state.lines ? `${RELATIVE}'s ${state.lines.length} things` : state.declined.name}.{" "}
          {RELATIVE} can see that.
        </Notice>
      )}
      <div className="heading">
        <h1>Nothing to approve</h1>
        <p className="lead">When {RELATIVE} asks for something, it shows up here.</p>
      </div>
    </>
  );
}

function LimitForm({ limit, setLimit }: { limit: Limit; setLimit?: Action }) {
  const inputId = useId();
  const hintId = useId();
  const errorId = useId();
  return (
    <form className="stack limit" action={setLimit}>
      <div className="heading">
        <label className="field-label" htmlFor={inputId}>
          Price limit
        </label>
        <p className="small" id={hintId}>
          {RELATIVE} is only shown items at or under this price.
        </p>
      </div>
      <div className="limit-row">
        <span className="money-input">
          <span aria-hidden="true">$</span>
          <input
            className="field-input"
            id={inputId}
            name="limit"
            inputMode="numeric"
            defaultValue={limit.cents / 100}
            aria-describedby={limit.error ? `${hintId} ${errorId}` : hintId}
            aria-invalid={limit.error || undefined}
          />
        </span>
        <Button type="submit" kind="secondary" busy={limit.busy} busyLabel="Saving…">
          Save
        </Button>
      </div>
      {limit.error && (
        <p className="field-error" id={errorId}>
          Pick a whole-dollar amount from $5 to $500.
        </p>
      )}
      {limit.saved && (
        <p className="small" role="status">
          Saved. {RELATIVE}&apos;s next search stays at {wholeDollars(limit.cents)} or less.
        </p>
      )}
    </form>
  );
}
