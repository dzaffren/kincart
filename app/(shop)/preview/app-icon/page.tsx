import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import "../approve-and-pay/preview.css";
import "./icon.css";

type Mark = { name: string; note: string; draw: (id: string) => ReactNode };

// Each mark is drawn on a 256 canvas; fit scales and centres it to about 62% of the tile.
const marks: Mark[] = [
  {
    name: "A · Reply",
    note: "The ask comes back with an OK. Clearest at 16px; also the closest to a stock chat icon.",
    draw: (id) => (
      <>
        <mask id={id} maskUnits="userSpaceOnUse" x="0" y="0" width="256" height="256">
          <rect width="256" height="256" fill="white" />
          <path className="icon-cut" strokeWidth="28" d="M86 124 L114 152 L172 94" />
        </mask>
        <g transform={fit(0.78, 130, 126)}>
          <path
            className="icon-mark"
            mask={`url(#${id})`}
            d="M128 24 A100 100 0 1 1 68 204 L34 228 L44 172 A100 100 0 0 1 128 24 Z"
          />
        </g>
      </>
    ),
  },
  {
    name: "B · Halves",
    note: "An S of two halves, one for each of you, that meet in the middle. The most ownable; the least literal.",
    draw: () => (
      <g transform={fit(0.84, 128, 128)}>
        <path
          className="icon-mark"
          d="M166.56 64.5 A63 63 0 1 0 112 159 A15 15 0 0 0 112 129 A33 33 0 1 1 140.58 79.5 A15 15 0 0 0 166.56 64.5 Z"
        />
        <path
          className="icon-mark"
          d="M144 97 A63 63 0 1 1 89.44 191.5 A15 15 0 0 1 115.42 176.5 A33 33 0 1 0 144 127 A15 15 0 0 1 144 97 Z"
        />
      </g>
    ),
  },
  {
    name: "C · Tag",
    note: "A price tag that says OK. Reads as shopping at once; close to a stock \"verified price\" icon.",
    draw: (id) => (
      <>
        <mask id={id} maskUnits="userSpaceOnUse" x="0" y="0" width="256" height="256">
          <rect width="256" height="256" fill="white" />
          <circle cx="128" cy="62" r="15" fill="black" />
          <path className="icon-cut" strokeWidth="28" d="M92 158 L118 184 L166 130" />
        </mask>
        <g transform={fit(0.75, 128, 128)}>
          <path
            className="icon-solid"
            mask={`url(#${id})`}
            d="M128 22 L196 82 V218 A16 16 0 0 1 180 234 H76 A16 16 0 0 1 60 218 V82 Z"
          />
        </g>
      </>
    ),
  },
];

function fit(scale: number, cx: number, cy: number): string {
  return `translate(${128 - scale * cx} ${128 - scale * cy}) scale(${scale})`;
}

export default function AppIconPreview() {
  if (process.env.VERCEL_ENV === "production") notFound();

  return (
    <main className="preview">
      <header className="preview-header">
        <h1>App icon: three concepts</h1>
        <p>
          Each mark at 192px, on a Home Screen at 64px on two wallpapers, cropped to Android&apos;s smallest circle, and
          as the 24px badge beside a notification. Corners are rounded the way iPhone rounds them. The tile and the mark
          stay the same in dark mode.
        </p>
      </header>

      {marks.map((mark, i) => (
        <section className="preview-section" key={mark.name}>
          <h2>{mark.name}</h2>
          <p className="icon-note">{mark.note}</p>
          <div className="icon-row">
            <Shot label="Close up">
              <Icon className="icon-large" draw={mark.draw} id={`m${i}a`} />
            </Shot>
            <Shot label="Home Screen">
              <div className="icon-walls">
                <div className="icon-wall icon-wall-pale">
                  <Icon className="icon-home" draw={mark.draw} id={`m${i}b`} />
                </div>
                <div className="icon-wall icon-wall-deep">
                  <Icon className="icon-home" draw={mark.draw} id={`m${i}c`} />
                </div>
              </div>
            </Shot>
            <Shot label="Android circle">
              <Icon className="icon-home icon-circle" draw={mark.draw} id={`m${i}d`} />
            </Shot>
            <Shot label="Notification badge">
              <p className="icon-strip">
                <Icon className="icon-badge" draw={mark.draw} id={`m${i}e`} />
                Rose would like something
              </p>
            </Shot>
          </div>
        </section>
      ))}
    </main>
  );
}

function Icon({ className, draw, id }: { className: string; draw: Mark["draw"]; id: string }) {
  return (
    <svg className={`icon ${className}`} viewBox="0 0 256 256" aria-hidden="true">
      <rect className="icon-tile" width="256" height="256" />
      {draw(id)}
    </svg>
  );
}

function Shot({ label, children }: { label: string; children: ReactNode }) {
  return (
    <figure className="icon-shot">
      {children}
      <figcaption>{label}</figcaption>
    </figure>
  );
}
