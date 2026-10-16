import { useId, type ReactNode } from "react";
import type { Group, Option } from "../../lib/shop/find";
import { things, type Item } from "../../lib/shop/items";
import type { DemoLogin } from "../../lib/shop/paypal";
import type { Line } from "../../lib/shop/requests";
import { Button } from "./Button";
import { LocalTime } from "./LocalTime";
import { PhotoPicker } from "./PhotoPicker";
import {
  HELPER,
  ItemPicker,
  listed,
  ListingPicker,
  money,
  Notice,
  ReceiptCard,
  Summary,
  type Receipt,
  wholeDollars,
} from "./ui";

type Outcome = { kind: "declined" | "failed"; item: Item; lines?: Line[] };

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
      linked?: boolean;
      limitCents: number;
      totalCents?: number;
      words?: string;
      previews?: string[];
      photos?: number;
      outcome?: Outcome;
      problem?: "empty" | "nothing found" | "over limit" | "too many" | "nothing in photo" | "not a photo";
      busy?: boolean;
    }
  | {
      kind: "options";
      limitCents: number;
      totalCents?: number;
      words: string;
      fromPhoto?: boolean;
      photos?: number;
      blankPhotos?: number;
      listings: Option[];
      picked?: string;
      error?: boolean;
      overCents?: number;
      busy?: boolean;
    }
  | {
      kind: "basket";
      limitCents: number;
      totalCents?: number;
      words: string;
      fromPhoto?: boolean;
      photos?: number;
      blankPhotos?: number;
      groups: Group[];
      picked?: string[];
      error?: boolean;
      overCents?: number;
      busy?: boolean;
    }
  | { kind: "waiting"; item: Item; askedAt: Date; shop?: string; lines?: Line[] }
  | { kind: "paid"; receipt: Receipt };

type Action = (formData: FormData) => void | Promise<void>;

type Props = {
  state: RoseState;
  items: Item[];
  link?: Action;
  skip?: Action;
  login?: DemoLogin;
  framedLink?: string;
  ask?: Action;
  find?: Action;
  tryAgain?: Action;
  notify?: ReactNode;
};

export function RoseView({ state, items, link, skip, login, framedLink, ask, find, tryAgain, notify }: Props) {
  const headingId = useId();
  const hintId = useId();
  const errorId = useId();
  const loginId = useId();

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
        {login && (
          <section className="summary login" aria-labelledby={loginId}>
            <h2 className="summary-title" id={loginId}>
              Sign in on PayPal with this demo login
            </h2>
            <dl>
              <dt className="small">Email</dt>
              <dd>
                <EmailLines email={login.email} />
              </dd>
              <dt className="small">Password</dt>
              <dd>{login.password}</dd>
            </dl>
            <p className="small">It&apos;s a PayPal sandbox account. No real money moves.</p>
          </section>
        )}
        {framedLink ? (
          // PayPal refuses to load in a frame, so a home page phone opens it in a new tab (D61).
          <form className="stack" method="post" action={framedLink} target="_blank">
            <Button type="submit">Link PayPal</Button>
            <p className="small">PayPal opens in a new tab. Come back here when you&apos;re done.</p>
          </form>
        ) : (
          <form action={link}>
            <Button type="submit" busy={state.busy} busyLabel="Opening PayPal…">
              Link PayPal
            </Button>
          </form>
        )}
        <form action={skip}>
          {framedLink && <input type="hidden" name="in" value="phone" />}
          <Button type="submit" kind="secondary" busyLabel="Setting up…">
            Skip: use the demo PayPal
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
        <Summary
          title={state.lines ? things(state.lines.length) : state.item.name}
          cents={state.item.cents}
          lines={state.lines}
          note={state.shop && `From ${state.shop}`}
        />
        {notify}
      </div>
    );
  }

  if (state.kind === "ask") {
    const limit = wholeDollars(state.limitCents);
    return (
      <div className="screen">
        {state.linked && <Notice tone="neutral">Your PayPal is linked. You won&apos;t need to do this again.</Notice>}
        <OutcomeNotice outcome={state.outcome} />
        {state.problem === "nothing found" && (
          <Notice tone="neutral">Couldn&apos;t find that. Try different words.</Notice>
        )}
        {state.problem === "nothing in photo" && (
          <Notice tone="neutral">
            {state.photos && state.photos > 1
              ? "Couldn't tell what to buy from those photos. Try other photos, or type what you need."
              : "Couldn't tell what to buy from that photo. Try another photo, or type what you need."}
          </Notice>
        )}
        {state.problem === "too many" && (
          <Notice tone="neutral">Up to 5 things at a time. Which 5 do you need most?</Notice>
        )}
        {state.problem === "over limit" && (
          <Notice tone="neutral">
            Nothing under {limit} for that. Try different words, or ask {HELPER} to raise the limit.
          </Notice>
        )}
        <div className="heading">
          <h1 id={headingId}>What do you need?</h1>
          <p className="small" id={hintId}>
            Say it the way you&apos;d tell {HELPER}, one thing or up to 5. For example: AA batteries, a night light
            and a phone charger.
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
                Type what you need, or add a photo, first.
              </p>
            )}
          </div>
          <PhotoPicker previews={state.previews} notPhoto={state.problem === "not a photo"} busy={state.busy} />
          <Button type="submit" busy={state.busy} busyLabel="Looking…">
            Find
          </Button>
        </form>
        <p className="small">
          {HELPER}&apos;s limit is {limit} an item
          {state.totalCents !== undefined && ` and ${wholeDollars(state.totalCents)} in all`}. Nothing is paid until{" "}
          {HELPER} says OK.
        </p>
        {notify}
      </div>
    );
  }

  // The page comes back scrolled to the top after Ask Sam, so its notices go at the top.
  if (state.kind === "options") {
    return (
      <div className="screen">
        {state.error && <Notice tone="neutral">Pick one first.</Notice>}
        <OverNotice totalCents={state.totalCents} overCents={state.overCents} several={false} />
        <BlankNotice blankPhotos={state.blankPhotos} />
        <div className="heading">
          <h1 id={headingId}>Which one would you like?</h1>
          <p className="small">
            For &ldquo;{state.words}&rdquo;
            {state.fromPhoto && fromPhotos(state.photos)}
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
          />
          <TotalLine totalCents={state.totalCents} />
          <Button type="submit" busy={state.busy} busyLabel={`Asking ${HELPER}…`}>
            Ask {HELPER}
          </Button>
        </form>
        {!state.busy && (
          <form action={tryAgain}>
            <Button type="submit" kind="secondary">
              Try other words
            </Button>
          </form>
        )}
      </div>
    );
  }

  if (state.kind === "basket") {
    return (
      <div className="screen">
        {state.error && <Notice tone="neutral">Pick at least one first.</Notice>}
        <OverNotice
          totalCents={state.totalCents}
          overCents={state.overCents}
          several={new Set(state.picked?.filter(Boolean)).size > 1}
        />
        <BlankNotice blankPhotos={state.blankPhotos} />
        <div className="heading">
          <h1>Which ones would you like?</h1>
          <p className="small">
            For &ldquo;{state.words}&rdquo;{state.fromPhoto && fromPhotos(state.photos)}. Pick one for each thing you want.
          </p>
        </div>
        <form className="stack" action={ask}>
          <div className="groups">
            {state.groups.map((group, index) => (
              <BasketGroup
                key={index}
                group={group}
                name={`pick-${index}`}
                limitCents={state.limitCents}
                picked={state.picked?.[index]}
              />
            ))}
          </div>
          <TotalLine totalCents={state.totalCents} />
          <Button type="submit" busy={state.busy} busyLabel={`Asking ${HELPER}…`}>
            Ask {HELPER}
          </Button>
        </form>
        {!state.busy && (
          <form action={tryAgain}>
            <Button type="submit" kind="secondary">
              Try other words
            </Button>
          </form>
        )}
      </div>
    );
  }

  if (state.kind === "paid") {
    return (
      <div className="screen">
        <h1>{HELPER} said OK. It&apos;s paid.</h1>
        <ReceiptCard receipt={state.receipt} />
        {state.receipt.leftOut && (
          <Notice tone="neutral">
            {HELPER} left out {listed(state.receipt.leftOut)}.
          </Notice>
        )}
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
      {notify}
    </div>
  );
}

type GroupProps = { group: Group; name: string; limitCents: number; picked?: string };

function BasketGroup({ group, name, limitCents, picked }: GroupProps) {
  const headingId = useId();
  return (
    <section className="stack">
      <h2 id={headingId}>{group.thing}</h2>
      {group.problem === "nothing found" && <Notice tone="neutral">Couldn&apos;t find this one.</Notice>}
      {group.problem === "over limit" && (
        <Notice tone="neutral">Nothing under {wholeDollars(limitCents)} for this one.</Notice>
      )}
      {group.options.length > 0 && (
        <ListingPicker
          listings={group.options}
          labelledBy={headingId}
          name={name}
          picked={picked}
          none="None of these"
        />
      )}
    </section>
  );
}

function TotalLine({ totalCents }: { totalCents?: number }) {
  if (totalCents === undefined) return null;
  return (
    <p className="small">
      {HELPER}&apos;s limit is {wholeDollars(totalCents)} in all.
    </p>
  );
}

function fromPhotos(photos?: number): string {
  return photos && photos > 1 ? ", from your photos" : ", from your photo";
}

// The photos are gone after Find (D64), so the note can only count the ones that showed nothing (D69).
function BlankNotice({ blankPhotos }: { blankPhotos?: number }) {
  if (!blankPhotos) return null;
  return (
    <Notice tone="neutral">
      {blankPhotos === 1 ? "One of your photos" : `${blankPhotos} of your photos`} showed nothing to buy.
    </Notice>
  );
}

function OverNotice({ totalCents, overCents, several }: { totalCents?: number; overCents?: number; several: boolean }) {
  if (totalCents === undefined || overCents === undefined) return null;
  return (
    <Notice tone="neutral">
      That comes to {money(overCents)}. {HELPER}&apos;s limit is {wholeDollars(totalCents)} in all.{" "}
      {several ? "Leave something out." : "Pick a cheaper one."}
    </Notice>
  );
}

// A long sandbox email wraps only before its @, never at the hyphen in "sb-".
function EmailLines({ email }: { email: string }) {
  const at = email.indexOf("@");
  if (at < 1) return email;
  return (
    <>
      <span>{email.slice(0, at)}</span>
      <wbr />
      <span>{email.slice(at)}</span>
    </>
  );
}

function OutcomeNotice({ outcome }: { outcome?: Outcome }) {
  if (outcome?.kind === "declined" && outcome.lines) {
    return (
      <Notice tone="neutral">
        {HELPER} said no to your {things(outcome.lines.length)}. Nothing was taken.
      </Notice>
    );
  }
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
