import Link from "next/link";
import { ArrowRight, BellRing, Brain, ShieldCheck } from "lucide-react";

export default function Home() {
  const features = [
    { icon: Brain, title: "Persistent memory", copy: "Your profile evolves with you." },
    { icon: BellRing, title: "Relevant alerts", copy: "Only changes tied to your facts." },
    { icon: ShieldCheck, title: "Safe decisions", copy: "Rules decide. AI explains." },
  ];

  return (
    <div className="relative min-h-screen overflow-hidden px-6 py-14 md:px-12 lg:px-20">
      <div className="absolute -right-24 -top-24 size-96 rounded-full bg-[#d8eadf] blur-3xl" />
      <div className="relative mx-auto max-w-6xl">
        <span className="inline-flex rounded-full border bg-white/70 px-3 py-1.5 text-xs font-semibold text-brand shadow-sm">
          A clearer path through immigration
        </span>
        <div className="mt-10 grid items-end gap-12 lg:grid-cols-[1.2fr_0.8fr]">
          <div>
            <h1 className="max-w-3xl text-5xl font-semibold leading-[1.05] tracking-[-0.045em] md:text-7xl">
              Know where you are.
              <br />
              <span className="text-brand">See what comes next.</span>
            </h1>
            <p className="mt-7 max-w-2xl text-lg leading-8 text-muted">
              Continuum remembers your journey, checks policy changes against
              your facts, and gives you a calm, practical next step.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Link
                href="/onboarding"
                className="inline-flex items-center gap-2 rounded-xl bg-brand px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-900/10 hover:bg-[#0e5c4e]"
              >
                Build my runway <ArrowRight className="size-4" />
              </Link>
              <Link href="/runway" className="rounded-xl border bg-white px-5 py-3 text-sm font-semibold hover:border-brand/30">
                View demo profile
              </Link>
            </div>
          </div>
          <div className="rounded-[28px] border bg-white/85 p-6 shadow-xl shadow-emerald-950/5 backdrop-blur">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
              One account, years of context
            </p>
            <div className="mt-6 space-y-5">
              {features.map(({ icon: Icon, title, copy }) => (
                <div key={title} className="flex gap-4">
                  <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand-soft text-brand">
                    <Icon className="size-5" />
                  </span>
                  <div>
                    <p className="font-semibold">{title}</p>
                    <p className="mt-1 text-sm text-muted">{copy}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        <p className="mt-20 text-xs text-muted">
          Educational planning only. Continuum does not provide legal advice or submit filings.
        </p>
      </div>
    </div>
  );
}
