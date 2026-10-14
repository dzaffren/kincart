import { useId, type ReactNode } from "react";
import { things, type Item } from "../../lib/shop/items";
import type { Line, Source } from "../../lib/shop/requests";
import { BasketAnswer } from "./BasketAnswer";
import { Button } from "./Button";
import { LocalTime } from "./LocalTime";
import { listed, money, Notice, ReceiptCard, RELATIVE, Summary, wholeDollars, type Receipt } from "./ui";

export type SamState =
  | { kind: "nothing"; declined?: Item; lines?: Line[] }
  | { kind: "request"; item: Item; askedAt: Date; busy?: boolean; found?: Source; lines?: Line[] }
  | { kind: "paid"; receipt: Receipt }
  | { kind: "failed"; item: Item; lines?: Line[] };

export type Limit = { cents: number; saved?: boolean; error?: boolean; busy?: boolean };

export type Total = { cents: number | null; saved?: boolean; error?: boolean; busy?: boolean };

type Action = (formData: FormData) => void | Promise<void>;

type Props = {
  state: SamState;
  answer?: Action;
  limit?: Limit;
  setLimit?: Action;
  total?: Total;
  setTotal?: Action;
  notify?: ReactNode;
};

export function SamView({ state, answer, limit, setLimit, total, setTotal, notify }: Props) {
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
      {limit && (
        <LimitForm
          label="Price limit"
          name="limit"
          hint={`${RELATIVE} is only shown items at or under this price.`}
          value={limit.cents / 100}
          error={limit.error && "Pick a whole-dollar amount from $5 to $500."}
          saved={limit.saved && `Saved. ${RELATIVE}'s next search stays at ${wholeDollars(limit.cents)} or less.`}
          busy={limit.busy}
          action={setLimit}
        />
      )}
      {total && (
        <LimitForm
          label="Total limit"
          name="total"
          hint={`The most ${RELATIVE} can ask for at once. Leave it empty for no total limit.`}
          value={total.cents === null ? "" : total.cents / 100}
          error={total.error && "Pick a whole-dollar amount from $5 to $2,500, or leave it empty."}
          saved={
            total.saved &&
            (total.cents === null
              ? "Saved. No total limit."
              : `Saved. ${RELATIVE} can ask for up to ${wholeDollars(total.cents)} at once.`)
          }
          busy={total.busy}
          action={setTotal}
        />
      )}
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
          {state.lines ? `the ${things(state.lines.length)}` : state.item.name}. {RELATIVE} can ask again.
        </Notice>
      </>
    );
  }

  return (
    <>
      {state.declined && (
        <Notice tone="neutral">
          You said no to {state.lines ? `${RELATIVE}'s ${things(state.lines.length)}` : state.declined.name}.{" "}
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

type LimitFormProps = {
  label: string;
  name: string;
  hint: string;
  value: number | string;
  error?: string | false;
  saved?: string | false;
  busy?: boolean;
  action?: Action;
};

function LimitForm({ label, name, hint, value, error, saved, busy, action }: LimitFormProps) {
  const inputId = useId();
  const hintId = useId();
  const errorId = useId();
  return (
    <form className="stack limit" action={action}>
      <div className="heading">
        <label className="field-label" htmlFor={inputId}>
          {label}
        </label>
        <p className="small" id={hintId}>
          {hint}
        </p>
      </div>
      <div className="limit-row">
        <span className="money-input">
          <span aria-hidden="true">$</span>
          <input
            className="field-input"
            id={inputId}
            name={name}
            inputMode="numeric"
            defaultValue={value}
            aria-describedby={error ? `${hintId} ${errorId}` : hintId}
            aria-invalid={!!error || undefined}
          />
        </span>
        <Button type="submit" kind="secondary" busy={busy} busyLabel="Saving…">
          Save
        </Button>
      </div>
      {error && (
        <p className="field-error" id={errorId}>
          {error}
        </p>
      )}
      {saved && (
        <p className="small" role="status">
          {saved}
        </p>
      )}
    </form>
  );
}
