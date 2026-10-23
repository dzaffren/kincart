import { useId, type ReactNode } from "react";
import type { Group, Last, Option } from "../../lib/shop/find";
import { things, type Item } from "../../lib/shop/items";
import type { DemoLogin } from "../../lib/shop/paypal";
import type { Line } from "../../lib/shop/requests";
import { Button } from "./Button";
import { LocalTime } from "./LocalTime";
import { PhotoPicker } from "./PhotoPicker";
import {
  HELPER,
  ItemPicker,
  LineItems,
  listed,
  ListingPicker,
  money,
  Notice,
  ReceiptCard,
  Summary,
  type Receipt,
  waitFor,
  wholeDollars,
} from "./ui";

type Outcome = { kind: "declined" | "failed"; item: Item; lines?: Line[] };

// An ask that Sam paid for, which Rose can ask again. lines are a basket's paid lines.
export type Bought = { id: number; item: Item; lines?: Line[]; paidAt: Date };

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
      problem?: "empty" | "nothing found" | "over limit" | "too many" | "nothing in photo" | "not a photo" | "limit";
      tried?: boolean;
      waitMinutes?: number;
      bought?: Bought[];
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
      tried?: boolean;
      last?: Last;
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
      // undefined for a group with no pick, and "" for None of these.
      picked?: (string | undefined)[];
      error?: boolean;
      overCents?: number;
      tried?: boolean;
      waitMinutes?: number;
      busy?: boolean;
    }
  | { kind: "waiting"; item: Item; askedAt: Date; shop?: string; lines?: Line[] }
  | { kind: "paid"; receipt: Receipt; waitMinutes?: number };

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
  findAnother?: Action;
  rebuy?: Action;
  notify?: ReactNode;
};

export function RoseView({
  state,
  items,
  link,
  skip,
  login,
  framedLink,
  ask,
  find,
  tryAgain,
  findAnother,
  rebuy,
  notify,
}: Props) {
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
          <Notice tone="neutral">{state.tried ? "Still couldn't" : "Couldn't"} find that. Try different words.</Notice>
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
        {state.waitMinutes !== undefined && <LimitNotice waitMinutes={state.waitMinutes} />}
        {state.problem === "over limit" && (
          <Notice tone="neutral">
            {state.tried ? "Still nothing" : "Nothing"} under {limit} for that. Try different words, or ask {HELPER} to
            raise the limit.
          </Notice>
        )}
        <AnotherForm action={findAnother} hint={anotherHint(state)} />
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
        <BoughtBefore bought={state.bought} action={rebuy} />
        {notify}
      </div>
    );
  }

  // The page comes back scrolled to the top after Ask Sam, so its notices go at the top.
  if (state.kind === "options") {
    return (
      <div className="screen">
        {state.error && <Notice tone="neutral">Pick one first.</Notice>}
        <LastNotice last={state.last} listings={state.listings} limitCents={state.limitCents} />
        <OverNotice totalCents={state.totalCents} overCents={state.overCents} several={false} />
        <BlankNotice blankPhotos={state.blankPhotos} />
        <div className="heading">
          <h1 id={headingId}>Which one would you like?</h1>
          <p className="small">
            For &ldquo;{state.words}&rdquo;
            {state.fromPhoto && fromPhotos(state.photos)}
            {state.tried && ". Looked again with other words"}
            {state.last && ". Today's prices for what you bought before"}
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
            bought={boughtOf(state.last, state.listings)}
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
        {state.waitMinutes !== undefined && <LimitNotice waitMinutes={state.waitMinutes} />}
        <OverNotice
          totalCents={state.totalCents}
          overCents={state.overCents}
          several={new Set(state.picked?.filter(Boolean)).size > 1}
        />
        <BlankNotice blankPhotos={state.blankPhotos} />
        <div className="heading">
          <h1>Which ones would you like?</h1>
          <p className="small">
            For &ldquo;{state.words}&rdquo;{state.fromPhoto && fromPhotos(state.photos)}
            {state.tried && ". Looked again with other words"}
            {state.groups.some(({ last }) => last) && ". Today's prices for what you bought before"}. Pick one for each
            thing you want.
          </p>
        </div>
        <form className="stack" action={ask}>
          <div className="groups">
            {state.groups.map((group, index) => (
              <BasketGroup
                key={index}
                group={group}
                index={index}
                limitCents={state.limitCents}
                picked={state.picked?.[index]}
                basketTried={state.tried}
              />
            ))}
          </div>
          <TotalLine totalCents={state.totalCents} />
          {/* Named, so a group's Find another, sent with this form, doesn't show this one as busy. */}
          <Button type="submit" name="ask" value="sam" busy={state.busy} busyLabel={`Asking ${HELPER}…`}>
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
        {state.waitMinutes !== undefined && <LimitNotice waitMinutes={state.waitMinutes} />}
        <h1>{HELPER} said OK. It&apos;s paid.</h1>
        <ReceiptCard receipt={state.receipt} />
        {state.receipt.leftOut && (
          <Notice tone="neutral">
            {HELPER} left out {listed(state.receipt.leftOut)}.
          </Notice>
        )}
        {state.receipt.leftOut && (
          <AnotherForm
            action={findAnother}
            hint={`KinCart looks again with other words, without ${
              state.receipt.leftOut.length > 1 ? "the ones" : "the one"
            } ${HELPER} left out.`}
          />
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

type GroupProps = {
  group: Group;
  index: number;
  limitCents: number;
  picked?: string;
  // A basket that Find another searched says so once, above its groups.
  basketTried?: boolean;
};

// A group's Find another sends the whole Ask Sam form, so Rose's picks in the other groups go with it, and
// askSam() hands it to findAnother(). It has no formAction: React leaves such a button's name out of the form.
function BasketGroup({ group, index, limitCents, picked, basketTried }: GroupProps) {
  const headingId = useId();
  return (
    <section className="stack">
      <h2 id={headingId}>{group.thing}</h2>
      {group.problem === "nothing found" && (
        <Notice tone="neutral">{group.tried ? "Still couldn't" : "Couldn't"} find this one.</Notice>
      )}
      {group.problem === "over limit" && (
        <Notice tone="neutral">
          {group.tried ? "Still nothing" : "Nothing"} under {wholeDollars(limitCents)} for this one.
        </Notice>
      )}
      {group.problem && !group.tried && (
        <div className="stack">
          <Button type="submit" kind="secondary" name="another" value={String(index)} busyLabel="Looking…">
            Find another
          </Button>
          <p className="small">KinCart tries other words for this one.</p>
        </div>
      )}
      {group.tried && !basketTried && group.options.length > 0 && (
        <p className="small">Looked again with other words.</p>
      )}
      {group.options.length > 0 && <LastNotice last={group.last} listings={group.options} limitCents={limitCents} />}
      {group.options.length > 0 && (
        <ListingPicker
          listings={group.options}
          labelledBy={headingId}
          name={`pick-${index}`}
          picked={picked}
          none="None of these"
          bought={boughtOf(group.last, group.options)}
        />
      )}
    </section>
  );
}

// One Find another for each empty Find, No or untick (D97): a search it ran itself offers none.
function anotherHint(state: Extract<RoseState, { kind: "ask" }>): string | undefined {
  if (state.outcome?.kind === "declined") {
    return state.outcome.lines
      ? `KinCart looks again for each thing, without the ones ${HELPER} said no to.`
      : `KinCart looks again with other words, without the one ${HELPER} said no to.`;
  }
  if ((state.problem === "nothing found" || state.problem === "over limit") && !state.tried) {
    return "KinCart tries other words for you.";
  }
  return undefined;
}

// Sam's newest paid asks, each with its own form, so only the pressed Ask again shows "Looking…".
function BoughtBefore({ bought, action }: { bought?: Bought[]; action?: Action }) {
  const headingId = useId();
  if (!bought?.length) return null;
  return (
    <section className="stack" aria-labelledby={headingId}>
      <div className="heading">
        <h2 id={headingId}>Bought before</h2>
        <p className="small">Ask again looks for the same things at today&apos;s prices.</p>
      </div>
      <div className="groups">
        {bought.map(({ id, item, lines, paidAt }) => (
          <form className="stack" action={action} key={id}>
            <input type="hidden" name="request" value={id} />
            <div className="summary">
              {lines && <p className="summary-title">{things(lines.length)}</p>}
              <LineItems lines={lines ?? [item]} />
              <p className="small">
                Paid <LocalTime at={paidAt} format="day" />
              </p>
            </div>
            <Button type="submit" kind="secondary" busyLabel="Looking…">
              Ask again
            </Button>
          </form>
        ))}
      </div>
    </section>
  );
}

// The listing Rose bought last time, when today's options have it, and what changed about it since.
function boughtOf(last: Last | undefined, listings: Option[]) {
  const now = last && listings.find(({ id }) => id === last.id);
  return last && now ? { id: now.id, note: changeOf(last, now) } : undefined;
}

function changeOf(last: Last, now: Option): string {
  const price = now.cents !== last.cents;
  const shop = now.shop !== last.shop;
  if (price && shop) return `Now ${money(now.cents)} from ${now.shop}. It was ${money(last.cents)} from ${last.shop}.`;
  if (price) return `Now ${money(now.cents)}. It was ${money(last.cents)}.`;
  if (shop) return `Now from ${now.shop}. It was from ${last.shop}.`;
  return "Same price as last time.";
}

// Said when today's options don't have the listing Rose bought last time.
function LastNotice({ last, listings, limitCents }: { last?: Last; listings: Option[]; limitCents: number }) {
  if (!last || listings.some(({ id }) => id === last.id)) return null;
  return (
    <Notice tone="neutral">
      {last.nowCents
        ? `The one you bought last time is ${money(last.nowCents)} now, over ${HELPER}'s ${wholeDollars(limitCents)} limit.`
        : "Couldn't find the one you bought last time today."}
    </Notice>
  );
}

// A Find or a Find another past the address's 20 for the day (D77, D101).
function LimitNotice({ waitMinutes }: { waitMinutes?: number }) {
  return (
    <Notice tone="neutral">
      That&apos;s a lot of Finds from here today. Try again in {waitFor(waitMinutes ?? 0)}.
    </Notice>
  );
}

function AnotherForm({ action, hint }: { action?: Action; hint?: string }) {
  if (!hint) return null;
  return (
    <form className="stack" action={action}>
      <Button type="submit" kind="secondary" busyLabel="Looking…">
        Find another
      </Button>
      <p className="small">{hint}</p>
    </form>
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
