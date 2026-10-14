import { useId, type ReactNode } from "react";
import type { Option } from "../../lib/shop/find";
import type { Item } from "../../lib/shop/items";
import type { Line } from "../../lib/shop/requests";
import { LocalTime } from "./LocalTime";

export const RELATIVE = "Rose";
export const HELPER = "Sam";

export type Receipt = { item: Item; paidAt: Date; transactionId: string; lines?: Line[]; leftOut?: string[] };

const usd = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

export function money(cents: number): string {
  return usd.format(cents / 100);
}

export function wholeDollars(cents: number): string {
  return `$${Math.floor(cents / 100)}`;
}

const and = new Intl.ListFormat("en-US");

export function listed(words: string[]): string {
  return and.format(words);
}

export function Notice({ tone, children }: { tone: "wait" | "danger" | "neutral"; children: ReactNode }) {
  return (
    <p className="notice" data-tone={tone} role="status">
      {children}
    </p>
  );
}

export function Summary({ title, cents, note, lines }: { title?: string; cents: number; note?: string; lines?: Item[] }) {
  return (
    <div className="summary">
      {title && <p className="summary-title">{title}</p>}
      <p className="amount">{money(cents)}</p>
      {lines && <LineItems lines={lines} />}
      {note && <p className="small">{note}</p>}
    </div>
  );
}

export function LineItems({ lines }: { lines: Item[] }) {
  return (
    <ul className="line-items">
      {lines.map((line) => (
        <li key={line.id}>
          <span>{line.name}</span>
          <span className="line-price">{money(line.cents)}</span>
        </li>
      ))}
    </ul>
  );
}

export function ReceiptCard({ receipt }: { receipt: Receipt }) {
  return (
    <div className="receipt" role="status">
      <p className="receipt-status">Paid</p>
      <p className="amount">{money(receipt.item.cents)}</p>
      {receipt.lines ? <LineItems lines={receipt.lines} /> : <p>{receipt.item.name}</p>}
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

type ListingPickerProps = {
  listings: Option[];
  labelledBy: string;
  name?: string;
  picked?: string;
  none?: string;
};

export function ListingPicker({ listings, labelledBy, name = "listing", picked, none }: ListingPickerProps) {
  return (
    <fieldset className="options" aria-labelledby={labelledBy}>
      {listings.map((listing) => (
        <label className="option" key={listing.id}>
          <input
            className="option-input"
            type="radio"
            name={name}
            value={listing.id}
            defaultChecked={listing.id === picked}
          />
          <span className="option-body listing">
            <span className="option-ring" aria-hidden="true" />
            <span className="listing-title">
              <span className="listing-name">{listing.name}</span>
              <span>
                <span className="option-price">{money(listing.cents)}</span>{" "}
                <span className="small">at {listing.shop}</span>
              </span>
            </span>
            <span className="listing-text">
              {listing.imageUrl && (
                // A 64px photo from Channel3's CDN gains nothing from Vercel's image optimizer.
                // eslint-disable-next-line @next/next/no-img-element
                <img className="listing-photo" src={listing.imageUrl} alt="" />
              )}
              <span>
                {listing.what} {listing.why}
              </span>
              <span>
                <strong>Good to know:</strong> {listing.watch}
              </span>
            </span>
          </span>
        </label>
      ))}
      {/* A radio can't be unticked, so this is how Rose takes back a pick. */}
      {none && (
        <label className="option">
          <input className="option-input" type="radio" name={name} value="" defaultChecked={picked === ""} />
          <span className="option-body">
            <span className="option-ring" aria-hidden="true" />
            <span>{none}</span>
          </span>
        </label>
      )}
    </fieldset>
  );
}
