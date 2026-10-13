import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import "../approve-and-pay/preview.css";
import "./icon.css";

type Mark = { name: string; note: string; draw: () => ReactNode };

// Each mark is drawn centred on a 256 canvas; fit scales it to about 62% of the tile.
const marks: Mark[] = [
  {
    name: "A · And",
    note: "An ampersand, Rose & Sam, whose leg ends in the OK. Letterform.",
    draw: () => (
      <g transform={fit(0.67, 128, 128)}>
        <path className="icon-fill" d="M230.425,127.779 L192.425,217.779 Q190.878,221.444 188.045,224.238 Q185.213,227.032 181.528,228.529 Q177.842,230.027 173.864,229.999 Q169.886,229.972 166.221,228.425 Q161.624,226.484 158.478,222.612 L93.537,142.685 Q77.119,156.905 71.653,163.669 Q64,173.139 64,182 Q64,192.176 72.393,198.802 Q81.51,206 94,206 Q100.127,206 103.71,203.85 Q107.121,201.803 111.056,201.218 Q114.991,200.632 118.851,201.597 Q122.71,202.562 125.907,204.93 Q129.103,207.299 131.15,210.71 Q133.197,214.121 133.782,218.056 Q134.368,221.991 133.403,225.851 Q132.438,229.71 130.07,232.907 Q127.701,236.103 124.29,238.15 Q111.206,246 94,246 Q67.623,246 47.607,230.198 Q24,211.56 24,182 Q24,158.996 40.542,138.527 Q48.244,128.997 67.897,111.98 Q57.245,99.878 52.987,93.121 Q44,78.864 44,64 Q44,39.471 61.749,23.77 Q77.315,10 98,10 Q118.281,10 133.919,23.232 Q152,38.532 152,62 Q152,82.841 138.177,101.001 Q133.326,107.375 123.706,116.384 L168.526,171.547 L193.575,112.221 Q195.122,108.556 197.955,105.762 Q200.787,102.968 204.472,101.471 Q208.158,99.973 212.136,100 Q216.114,100.028 219.779,101.575 Q223.444,103.122 226.238,105.955 Q229.032,108.787 230.529,112.472 Q232.027,116.158 231.999,120.136 Q231.972,124.114 230.425,127.779 Z M98.015,85.658 Q103.737,80.206 106.348,76.775 Q112,69.349 112,62 Q112,57.084 108.081,53.768 Q103.628,50 98,50 Q92.468,50 88.251,53.73 Q84,57.491 84,64 Q84,67.309 86.826,71.793 Q89.429,75.923 98.015,85.658 Z" />
      </g>
    ),
  },
  {
    name: "B · Armchair",
    note: "The h in shop is an armchair: shop without leaving your chair. Wordmark; the h alone is the icon.",
    draw: () => (
      <g transform={fit(0.8, 128, 128)}>
        <path className="icon-fill" d="M58.806,228 L58.806,47.609 C58.806,36.741 67.615,27.931 78.483,27.931 C89.35,27.931 98.16,36.741 98.16,47.609 L98.16,228 Z M58.806,130.084 L58.806,84.327 L174.61,84.327 C187.245,84.327 197.488,94.57 197.488,107.206 C197.488,119.841 187.245,130.084 174.61,130.084 Z M143.54,130.084 L183.084,130.084 L174.516,228 L152.108,228 Z" />
      </g>
    ),
  },
  {
    name: "C · Glasses",
    note: "Browline reading glasses, two lenses on one frame. Pictorial.",
    draw: () => (
      <g transform={fit(0.73, 128, 128)}>
        <path className="icon-fill" d="M138,132 Q138,112.118 152.059,98.059 Q166.118,84 186,84 Q205.882,84 219.941,98.059 Q234,112.118 234,132 Q234,151.882 219.941,165.941 Q205.882,180 186,180 Q166.118,180 152.059,165.941 Q138,151.882 138,132 Z M22,132 Q22,112.118 36.059,98.059 Q50.118,84 70,84 Q89.882,84 103.941,98.059 Q118,112.118 118,132 Q118,151.882 103.941,165.941 Q89.882,180 70,180 Q50.118,180 36.059,165.941 Q22,151.882 22,132 Z M34,132 Q34,146.912 44.544,157.456 Q55.088,168 70,168 Q84.912,168 95.456,157.456 Q106,146.912 106,132 Q106,117.088 95.456,106.544 Q84.912,96 70,96 Q55.088,96 44.544,106.544 Q34,117.088 34,132 Z M150,132 Q150,146.912 160.544,157.456 Q171.088,168 186,168 Q200.912,168 211.456,157.456 Q222,146.912 222,132 Q222,117.088 211.456,106.544 Q200.912,96 186,96 Q171.088,96 160.544,106.544 Q150,117.088 150,132 Z" />
        <path className="icon-fill" d="M133.409,112.864 Q139.466,96.306 153.917,86.205 Q168.368,76.104 186,76.104 Q203.631,76.104 218.083,86.205 Q232.534,96.306 238.591,112.864 Q240.014,116.754 238.27,120.511 Q236.526,124.268 232.636,125.691 Q228.746,127.114 224.989,125.37 Q221.232,123.626 219.809,119.736 Q215.915,109.091 206.625,102.597 Q197.335,96.104 186,96.104 Q174.665,96.104 165.375,102.597 Q156.085,109.091 152.191,119.736 Q150.768,123.626 147.011,125.37 Q143.254,127.114 139.364,125.691 Q135.474,124.268 133.73,120.511 Q131.986,116.754 133.409,112.864 Z M17.409,112.864 Q23.466,96.306 37.917,86.205 Q52.368,76.104 70,76.104 Q87.631,76.104 102.083,86.205 Q116.534,96.306 122.591,112.864 Q124.014,116.754 122.27,120.511 Q120.526,124.268 116.636,125.691 Q112.746,127.114 108.989,125.37 Q105.232,123.626 103.809,119.736 Q99.915,109.091 90.625,102.597 Q81.335,96.104 70,96.104 Q58.665,96.104 49.375,102.597 Q40.085,109.091 36.191,119.736 Q34.768,123.626 31.011,125.37 Q27.254,127.114 23.364,125.691 Q19.474,124.268 17.73,120.511 Q15.986,116.754 17.409,112.864 Z" />
        <path className="icon-fill" d="M108.352,112.765 Q117.549,100.15 128,100.15 Q138.451,100.15 147.648,112.765 Q149.112,114.774 148.728,117.229 Q148.343,119.684 146.335,121.148 Q144.326,122.612 141.871,122.228 Q139.416,121.843 137.952,119.835 Q132.349,112.15 128,112.15 Q123.651,112.15 118.048,119.835 Q116.584,121.843 114.129,122.228 Q111.674,122.612 109.665,121.148 Q107.657,119.684 107.272,117.229 Q106.888,114.774 108.352,112.765 Z" />
        <path className="icon-fill" d="M26.8,122.3 L10,122.3 Q7.515,122.3 5.757,120.543 Q4,118.785 4,116.3 Q4,113.815 5.757,112.057 Q7.515,110.3 10,110.3 L26.8,110.3 Q29.285,110.3 31.043,112.057 Q32.8,113.815 32.8,116.3 Q32.8,118.785 31.043,120.543 Q29.285,122.3 26.8,122.3 Z M229.2,110.3 L246,110.3 Q248.485,110.3 250.243,112.057 Q252,113.815 252,116.3 Q252,118.785 250.243,120.543 Q248.485,122.3 246,122.3 L229.2,122.3 Q226.715,122.3 224.957,120.543 Q223.2,118.785 223.2,116.3 Q223.2,113.815 224.957,112.057 Q226.715,110.3 229.2,110.3 Z" />
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
        <h1>App icon: round 3</h1>
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
