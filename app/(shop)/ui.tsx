import { useId, type ReactNode } from "react";
import type { Item } from "../../lib/shop/items";
import { LocalTime } from "./LocalTime";

export const RELATIVE = "Rose";
export const HELPER = "Sam";

export type Receipt = { item: Item; paidAt: Date; transactionId: string };

const usd = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

export function money(cents: number): string {
  return usd.format(cents / 100);
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
      <p className="receipt-detail">
        <LocalTime at={receipt.paidAt} format="day" />
      </p>
      <p className="receipt-detail">PayPal transaction {receipt.transactionId}</p>
    </div>
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
