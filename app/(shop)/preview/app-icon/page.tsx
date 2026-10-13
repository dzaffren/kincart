import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import "../approve-and-pay/preview.css";
import "./icon.css";

type Mark = { name: string; note: string; draw: () => ReactNode };

// Each mark is drawn on a 256 canvas; fit scales and centres it to about 62% of the tile.
const marks: Mark[] = [
  {
    name: "A · And",
    note: "An ampersand, Rose & Sam, whose last stroke is the OK.",
    draw: () => (
      <g transform={fit(0.7, 136, 129)}>
        <path
          className="icon-stroke"
          strokeWidth="34"
          d="M220 120 L182 210 L104 114 C88 94 74 82 74 66 C74 44 90 32 106 32 C122 32 138 44 138 64 C138 86 120 100 102 116 C74 140 52 156 52 182 C52 210 78 226 104 226 C116 226 124 222 130 216"
        />
      </g>
    ),
  },
  {
    name: "B · st",
    note: "One line writes s and t and joins them: the printer's sign for letters held together.",
    draw: () => (
      <g transform={fit(0.78, 128, 124)}>
        <path
          className="icon-stroke"
          strokeWidth="32"
          d="M44 202 A32 32 0 1 0 78 156 A28 28 0 0 1 78 100 C104 100 118 38 150 38 C170 38 178 56 178 84 V182 A28 28 0 0 0 206 210 H212"
        />
        <path className="icon-stroke" strokeWidth="32" d="M152 120 H206" />
      </g>
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
        <h1>App icon: round 2</h1>
        <p>
          Each mark at 192px, on a Home Screen at 64px on two wallpapers, cropped to Android&apos;s smallest circle, and
          as the 24px badge beside a notification. Corners are rounded the way iPhone rounds them. The tile and the mark
          stay the same in dark mode.
        </p>
      </header>

      {marks.map((mark) => (
        <section className="preview-section" key={mark.name}>
          <h2>{mark.name}</h2>
          <p className="icon-note">{mark.note}</p>
          <div className="icon-row">
            <Shot label="Close up">
              <Icon className="icon-large" draw={mark.draw} />
            </Shot>
            <Shot label="Home Screen">
              <div className="icon-walls">
                <div className="icon-wall icon-wall-pale">
                  <Icon className="icon-home" draw={mark.draw} />
                </div>
                <div className="icon-wall icon-wall-deep">
                  <Icon className="icon-home" draw={mark.draw} />
                </div>
              </div>
            </Shot>
            <Shot label="Android circle">
              <Icon className="icon-home icon-circle" draw={mark.draw} />
            </Shot>
            <Shot label="Notification badge">
              <p className="icon-strip">
                <Icon className="icon-badge" draw={mark.draw} />
                Rose would like something
              </p>
            </Shot>
          </div>
        </section>
      ))}
    </main>
  );
}

function Icon({ className, draw }: { className: string; draw: Mark["draw"] }) {
  return (
    <svg className={`icon ${className}`} viewBox="0 0 256 256" aria-hidden="true">
      <rect className="icon-tile" width="256" height="256" />
      {draw()}
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
