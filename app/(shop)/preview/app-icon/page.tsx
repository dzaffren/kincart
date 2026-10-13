import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import "../approve-and-pay/preview.css";
import "./icon.css";

type Mark = { name: string; note: string; draw: (id: string) => ReactNode };

const marks: Mark[] = [
  {
    name: "Tick in a speech bubble",
    note: "Rose asks, Sam says OK.",
    draw: (id) => (
      <>
        <mask id={id}>
          <rect width="100" height="100" fill="white" />
          <path className="icon-cut" d="M38 45 L46 53 L62 37" />
        </mask>
        <path
          className="icon-mark"
          mask={`url(#${id})`}
          d="M34 24 H66 A12 12 0 0 1 78 36 V54 A12 12 0 0 1 66 66 H46 L30 78 L34 66 A12 12 0 0 1 22 54 V36 A12 12 0 0 1 34 24 Z"
        />
      </>
    ),
  },
  {
    name: "Two overlapping circles",
    note: "Two people, one purchase.",
    draw: () => (
      <>
        <circle className="icon-ring" cx="39" cy="50" r="17" />
        <circle className="icon-ring" cx="61" cy="50" r="17" />
      </>
    ),
  },
  {
    name: "S in Atkinson Hyperlegible Next Bold",
    note: "The system's type, as a letter tile.",
    draw: () => (
      <text className="icon-mark icon-letter" x="50" y="50" textAnchor="middle" dominantBaseline="central">
        S
      </text>
    ),
  },
];

export default function AppIconPreview() {
  if (process.env.VERCEL_ENV === "production") notFound();

  return (
    <main className="preview">
      <header className="preview-header">
        <h1>App icon: three marks</h1>
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
    <svg className={`icon ${className}`} viewBox="0 0 100 100" aria-hidden="true">
      <rect className="icon-tile" width="100" height="100" />
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
