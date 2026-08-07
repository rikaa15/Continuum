import Link from "next/link";
import { ArrowRight, Leaf } from "lucide-react";

export default function Home() {
  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,#d8eadf_0%,transparent_42%),linear-gradient(180deg,#f7f8f5_0%,#eef3ef_100%)]" />
      <div className="absolute -left-20 bottom-0 size-[28rem] rounded-full bg-[#f4e7c8]/60 blur-3xl" />

      <div className="relative mx-auto flex min-h-screen max-w-5xl flex-col px-6 py-10 md:px-12">
        <div className="flex items-center gap-3 text-lg font-semibold text-[#18332d]">
          <span className="grid size-10 place-items-center rounded-xl bg-[#143b33] text-white">
            <Leaf className="size-5" />
          </span>
          Continuum
        </div>

        <div className="flex flex-1 flex-col justify-center py-16">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand">
            Immigration runway
          </p>
          <h1 className="mt-5 max-w-3xl text-5xl font-semibold leading-[1.05] tracking-[-0.045em] md:text-7xl">
            Know where you are.
            <br />
            <span className="text-brand">See what comes next.</span>
          </h1>
          <p className="mt-7 max-w-xl text-lg leading-8 text-muted">
            A calm place to track your status, deadlines, and the next safe step
            in your immigration journey.
          </p>

          <div className="mt-10 flex flex-wrap gap-3">
            <Link
              href="/onboarding"
              className="inline-flex items-center gap-2 rounded-xl bg-brand px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-900/10 hover:bg-[#0e5c4e]"
            >
              Build my runway <ArrowRight className="size-4" />
            </Link>
            <Link
              href="/runway"
              className="rounded-xl border border-[#dde4df] bg-white px-5 py-3 text-sm font-semibold text-[#18332d] hover:border-brand/30"
            >
              Explore a sample profile
            </Link>
          </div>
        </div>

        <p className="pb-4 text-xs text-muted">
          Educational planning only. Continuum does not provide legal advice or
          submit filings.
        </p>
      </div>
    </div>
  );
}
