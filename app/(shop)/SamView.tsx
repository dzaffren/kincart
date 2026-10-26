import { useId, type ReactNode } from "react";
import { things, type Item } from "../../lib/shop/items";
import type { Line, Source } from "../../lib/shop/requests";
import { BasketAnswer } from "./BasketAnswer";
import { Button } from "./Button";
import { LocalTime } from "./LocalTime";
import { GuardedForm } from "./PasskeyControl";
import { ShareLink } from "./ShareLink";
import {
  AnotherForm,
  LimitNotice,
  listed,
  money,
  Notice,
  OkInTabHint,
  ReceiptCard,
  RELATIVE,
  Summary,
  wholeDollars,
  type Receipt,
} from "./ui";

// Find another after Sam's No or untick: offered, or how the search for Rose ended (D113, D115).
export type SamAgain = "offer" | "options" | "nothing";

export type SamState =
  | { kind: "nothing"; declined?: Item; lines?: Line[]; again?: SamAgain; waitMinutes?: number }
  | { kind: "request"; item: Item; askedAt: Date; busy?: boolean; found?: Source; lines?: Line[]; limitCents?: number }
  | { kind: "paid"; receipt: Receipt; again?: SamAgain; waitMinutes?: number }
  | { kind: "failed"; item: Item; lines?: Line[] };

// New links: offered under the limits, the screen that asks first, or made, with Rose's new link to send.
export type Links = { kind: "offer" } | { kind: "confirm" } | { kind: "made"; roseLink: string };

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
  findAnother?: Action;
  notify?: ReactNode;
  links?: Links;
  makeLinks?: Action;
  passkey?: ReactNode;
  refused?: "ok" | "links";
  okInTab?: string;
  // Sam's link, when the passkey is on: OK and Make new links ask the phone first (D122).
  guard?: string;
};

export function SamView({
  state,
  answer,
  limit,
  setLimit,
  total,
  setTotal,
  findAnother,
  notify,
  links,
  makeLinks,
  passkey,
  refused,
  okInTab,
  guard,
}: Props) {
  if (links?.kind === "confirm") return <ConfirmLinks makeLinks={makeLinks} refused={refused === "links"} guard={guard} />;

  if (state.kind === "request" && state.lines) {
    return (
      <div className="screen">
        {refused === "ok" && <RefusedOk />}
        <BasketAnswer
          okInTab={okInTab}
          guard={guard}
          lines={state.lines}
          askedAt={state.askedAt}
          answer={answer}
          busy={state.busy}
          limitCents={state.limitCents}
        />
      </div>
    );
  }

  if (state.kind === "request") {
    const { found, limitCents } = state;
    return (
      <div className="screen">
        {refused === "ok" && <RefusedOk />}
        {limitCents !== undefined && state.item.cents > limitCents && (
          <Notice tone="neutral">
            This is {money(state.item.cents - limitCents)} over your {wholeDollars(limitCents)} limit.
          </Notice>
        )}
        <h1>{found ? `${RELATIVE} would like this` : `${RELATIVE} would like ${state.item.name}`}</h1>
        <Summary
          title={found && state.item.name}
          cents={state.item.cents}
          note={`${found ? `From ${found.shop}. ` : ""}Paid from ${RELATIVE}'s PayPal if you say OK.`}
        />
        {found && (
          <div className="heading">
            {found.imageUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img className="listing-photo" src={found.imageUrl} alt="" />
            )}
            <p>
              <strong>Why it fits:</strong> {found.reason}
            </p>
            {found.watch && (
              <p>
                <strong>Good to know:</strong> {found.watch}
              </p>
            )}
            <a className="link" href={found.url} target="_blank" rel="noopener noreferrer">
              See it on {found.shop}
            </a>
          </div>
        )}
        <p className="small">
          Asked at <LocalTime at={state.askedAt} format="clock" />.
        </p>
        <GuardedForm className="stack" action={answer} guard={guard}>
          {state.busy ? (
            <Button type="submit" busy busyLabel="Paying…" />
          ) : (
            <>
              {okInTab ? (
                <Button type="submit" formAction={okInTab} formMethod="get" formTarget="_blank">
                  OK, pay {money(state.item.cents)}
                </Button>
              ) : (
                <Button type="submit" name="answer" value="ok" busyLabel={guard ? "Checking it's you…" : "Paying…"}>
                  OK, pay {money(state.item.cents)}
                </Button>
              )}
              <Button type="submit" name="answer" value="no" kind="secondary">
                No
              </Button>
            </>
          )}
        </GuardedForm>
        {okInTab && <OkInTabHint />}
      </div>
    );
  }

  return (
    <div className="screen">
      {links?.kind === "made" && <LinksMade roseLink={links.roseLink} />}
      {state.kind !== "failed" && state.waitMinutes !== undefined && <LimitNotice waitMinutes={state.waitMinutes} />}
      <SamOutcome state={state} findAnother={findAnother} />
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
      {passkey}
      {links && <OfferLinks />}
    </div>
  );
}

function RefusedOk() {
  return <Notice tone="neutral">Not paid. This OK needs your face or fingerprint, on the phone that turned it on.</Notice>;
}

function OfferLinks() {
  const labelId = useId();
  return (
    <form className="stack links" aria-labelledby={labelId}>
      <div className="heading">
        <p className="field-label" id={labelId}>
          Your links
        </p>
        <p className="small">
          If someone else may have seen {RELATIVE}&apos;s link or yours, make new ones. The old links stop working
          straight away.
        </p>
      </div>
      <Button type="submit" name="links" value="new" kind="secondary">
        Make new links
      </Button>
    </form>
  );
}

function ConfirmLinks({ makeLinks, refused, guard }: { makeLinks?: Action; refused?: boolean; guard?: string }) {
  const listId = useId();
  return (
    <div className="screen">
      {refused && (
        <Notice tone="neutral">
          No new links made. This needs your face or fingerprint, on the phone that turned it on.
        </Notice>
      )}
      <h1>Make new links?</h1>
      <p className="lead">
        You and {RELATIVE} each get a new link. Nobody can open KinCart with the old ones again.
      </p>
      <section className="summary changes" aria-labelledby={listId}>
        <h2 className="summary-title" id={listId}>
          What changes
        </h2>
        <p>{RELATIVE}&apos;s old link stops working. You send {RELATIVE} the new one from the next screen.</p>
        <p>This page moves to your new link, so save it again.</p>
        <p>Notifications turn off on both phones until you each turn them on from the new link.</p>
        <p className="small">{RELATIVE}&apos;s PayPal, your limits and past buys stay as they are.</p>
      </section>
      <GuardedForm className="stack" action={makeLinks} guard={guard}>
        <Button type="submit" busyLabel={guard ? "Checking it's you…" : "Making new links…"}>
          Make new links
        </Button>
      </GuardedForm>
      <form className="stack">
        <Button type="submit" kind="secondary">
          Keep these
        </Button>
      </form>
    </div>
  );
}

function LinksMade({ roseLink }: { roseLink: string }) {
  const titleId = useId();
  const cut = roseLink.lastIndexOf("/") + 1;
  return (
    <>
      <Notice tone="neutral">New links made. This page is your new link: save it, or add it to your Home Screen again.</Notice>
      <section className="summary" aria-labelledby={titleId}>
        <h2 className="summary-title" id={titleId}>
          Send {RELATIVE} this new link
        </h2>
        <p>
          {roseLink.slice(0, cut)}
          <wbr />
          {roseLink.slice(cut)}
        </p>
        <ShareLink url={roseLink} title={`${RELATIVE}'s KinCart`} />
      </section>
    </>
  );
}

function SamOutcome({ state, findAnother }: { state: Exclude<SamState, { kind: "request" }>; findAnother?: Action }) {
  if (state.kind === "paid") {
    const several = (state.receipt.leftOut?.length ?? 0) > 1;
    return (
      <>
        <h1>Paid from {RELATIVE}&apos;s PayPal</h1>
        <ReceiptCard receipt={state.receipt} />
        {state.receipt.leftOut && (
          <Notice tone="neutral">
            You left out {listed(state.receipt.leftOut)}. {RELATIVE} can ask for {several ? "them" : "it"} again.
          </Notice>
        )}
        <LookAgain
          again={state.again}
          findAnother={findAnother}
          hint={`KinCart looks again for ${RELATIVE}, without ${several ? "the ones" : "the one"} you left out. ${RELATIVE} picks from what it finds.`}
        />
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
      <LookAgain
        again={state.again}
        findAnother={findAnother}
        hint={
          state.lines
            ? `KinCart looks again for each of ${RELATIVE}'s things, without the ones you said no to. ${RELATIVE} picks from what it finds.`
            : `KinCart looks again for ${RELATIVE}, without the one you said no to. ${RELATIVE} picks from what it finds.`
        }
      />
      <div className="heading">
        <h1>Nothing to approve</h1>
        <p className="lead">When {RELATIVE} asks for something, it shows up here.</p>
      </div>
    </>
  );
}

function LookAgain({ again, findAnother, hint }: { again?: SamAgain; findAnother?: Action; hint: string }) {
  if (again === "offer") return <AnotherForm action={findAnother} hint={hint} />;
  if (again === "options") {
    return (
      <Notice tone="neutral">
        KinCart found new options for {RELATIVE}. {RELATIVE} picks one and asks you.
      </Notice>
    );
  }
  if (again === "nothing") {
    return (
      <Notice tone="neutral">
        KinCart looked again and found nothing. {RELATIVE} can try different words.
      </Notice>
    );
  }
  return null;
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
