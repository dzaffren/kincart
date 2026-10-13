import { useId, type ButtonHTMLAttributes, type ReactNode } from "react";

export const RELATIVE = "Rose";
export const HELPER = "Sam";

export type Item = { id: string; name: string; cents: number };
export type Receipt = { item: Item; paidAt: Date; transactionId: string };

const usd = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
const clock = new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" });
const dayAndClock = new Intl.DateTimeFormat("en-US", {
  weekday: "short",
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

export function money(cents: number): string {
  return usd.format(cents / 100);
}

export function time(at: Date): string {
  return clock.format(at);
}

export function Notice({ tone, children }: { tone: "wait" | "danger" | "neutral"; children: ReactNode }) {
  return (
    <p className="notice" data-tone={tone} role="status">
      {children}
    </p>
  );
}

export function Summary({ title, cents, note }: { title?: string; cents: number; note?: string }) {
  return (
    <div className="summary">
      {title && <p className="summary-title">{title}</p>}
      <p className="amount">{money(cents)}</p>
      {note && <p className="small">{note}</p>}
    </div>
  );
}

export function ReceiptCard({ receipt }: { receipt: Receipt }) {
  return (
    <div className="receipt" role="status">
      <p className="receipt-status">Paid</p>
      <p className="amount">{money(receipt.item.cents)}</p>
      <p>{receipt.item.name}</p>
      <p className="receipt-detail">{dayAndClock.format(receipt.paidAt)}</p>
      <p className="receipt-detail">PayPal transaction {receipt.transactionId}</p>
    </div>
  );
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  kind?: "primary" | "secondary";
  busy?: string;
};

export function Button({ kind = "primary", busy, children, ...props }: ButtonProps) {
  return (
    <button className={`button button-${kind}`} aria-disabled={busy ? true : undefined} {...props}>
      {busy ? (
        <>
          <span className="spinner" aria-hidden="true" />
          {busy}
        </>
      ) : (
        children
      )}
    </button>
  );
}

type PickerProps = {
  items: Item[];
  labelledBy: string;
  picked?: string;
  error?: boolean;
};

export function ItemPicker({ items, labelledBy, picked, error }: PickerProps) {
  const errorId = useId();
  return (
    <>
      <fieldset className="options" aria-labelledby={labelledBy} aria-describedby={error ? errorId : undefined}>
        {items.map((item) => (
          <label className="option" key={item.id}>
            <input
              className="option-input"
              type="radio"
              name="item"
              value={item.id}
              defaultChecked={item.id === picked}
            />
            <span className="option-body">
              <span className="option-ring" aria-hidden="true" />
              <span>{item.name}</span>
              <span className="option-price">{money(item.cents)}</span>
            </span>
          </label>
        ))}
      </fieldset>
      {error && (
        <p className="field-error" id={errorId}>
          Pick one of the three first.
        </p>
      )}
    </>
  );
}
