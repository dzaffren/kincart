import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { RoseView } from "../../RoseView";
import { SamView } from "../../SamView";
import { PageHead, PhoneFrame } from "../../ui";
import "../approve-and-pay/preview.css";

const login = { email: "rose.kincart@example.com", password: "kincart-rose-1" };
const limit = { cents: 3000 };
const total = { cents: null };

export default function LinkPaypalOnboardingPreview() {
  if (process.env.VERCEL_ENV === "production") notFound();

  return (
    <main className="preview">
      <header className="preview-header">
        <h1>Link PayPal onboarding: every screen</h1>
        <p>
          Each frame is the real component with fixed data. The login stands in for the one Vercel&apos;s env will
          hold. The home page shows its new words at /.
        </p>
      </header>

      <section className="preview-section">
        <h2>Rose&apos;s phone, on its own</h2>
        <div className="frames">
          <Frame label="A new Rose starts here (scenario 1)">
            <PageHead />
            <RoseView state={{ kind: "not linked" }} items={[]} login={login} />
          </Frame>
          <Frame label="Link PayPal pressed">
            <PageHead />
            <RoseView state={{ kind: "not linked", busy: true }} items={[]} login={login} />
          </Frame>
          <Frame label="Back from PayPal without agreeing (scenario 4)">
            <PageHead />
            <RoseView state={{ kind: "not linked", cancelled: true }} items={[]} login={login} />
          </Frame>
          <Frame label="Back from PayPal, linked (scenario 2)">
            <PageHead />
            <RoseView state={{ kind: "ask", linked: true, limitCents: 3000 }} items={[]} />
          </Frame>
          <Frame label="No demo login in the env (local runs)">
            <PageHead />
            <RoseView state={{ kind: "not linked" }} items={[]} />
          </Frame>
        </div>
      </section>

      <section className="preview-section">
        <h2>Inside the home page&apos;s phones (scenario 1)</h2>
        <div className="frames">
          <PhoneFrame who="Rose">
            <PageHead />
            <RoseView state={{ kind: "not linked" }} items={[]} login={login} framed />
          </PhoneFrame>
          <PhoneFrame who="Sam">
            <PageHead />
            <SamView state={{ kind: "nothing" }} limit={limit} total={total} />
          </PhoneFrame>
        </div>
      </section>
    </main>
  );
}

function Frame({ label, children }: { label: string; children: ReactNode }) {
  return (
    <figure className="frame">
      <figcaption>{label}</figcaption>
      {children}
    </figure>
  );
}
