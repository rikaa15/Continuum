import { BarChart3, Database, Gauge, Sparkles } from "lucide-react";
import {
  getEconomicsSummary,
  isSnowflakeConfigured,
  type EconomicsSummary,
} from "@/lib/snowflake/client";

const demoSummary: EconomicsSummary = {
  runs: 2,
  actualTokens: 846,
  naiveTokens: 3540,
  actualCost: 0.00041,
  naiveCost: 0.00119,
  savingsPercent: 76.1,
  memoryHits: 0,
  measurement: "projected",
};

export default async function EconomicsPage() {
  let summary: EconomicsSummary | null = null;
  let error = "";
  if (isSnowflakeConfigured()) {
    try {
      summary = await getEconomicsSummary();
    } catch (caught) {
      error = caught instanceof Error ? caught.message : "Snowflake query failed";
    }
  }
  const data = summary ?? demoSummary;
  const isLive = Boolean(summary);
  const maxTokens = Math.max(data.naiveTokens, 1);

  return (
    <div className="px-6 py-9 md:px-12">
      <div className="mx-auto max-w-6xl">
        <header className="flex flex-wrap items-start justify-between gap-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand">Judge view</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight">Intelligence economics</h1>
            <p className="mt-2 max-w-2xl text-sm text-muted">The deterministic evaluator selects relevant profile facts. EverOS mirrors structured memory and supports explicit profile reconciliation; it is not queried for every alert.</p>
          </div>
          <span className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${isLive ? "bg-brand-soft text-brand" : "bg-amber-50 text-amber-800"}`}>
            <Database className="mr-1.5 inline size-3.5" />
            {isLive ? "Live Snowflake query" : "Projected sample"}
          </span>
        </header>

        {!isLive && (
          <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-900">
            {error || "Snowflake is not configured."} Values below are visibly labeled projections and are not submission evidence.
          </div>
        )}

        <section className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[
            [Sparkles, "Token savings", `${data.savingsPercent.toFixed(1)}%`],
            [Gauge, "Optimized tokens", data.actualTokens.toLocaleString()],
            [BarChart3, "Full-profile tokens", data.naiveTokens.toLocaleString()],
            [Database, "Sample size", `${data.runs} runs`],
          ].map(([Icon, label, value]) => {
            const MetricIcon = Icon as typeof Sparkles;
            return (
              <div key={String(label)} className="rounded-2xl border bg-white p-5 shadow-sm">
                <MetricIcon className="size-4 text-brand" />
                <p className="mt-5 text-xs font-semibold uppercase tracking-[0.14em] text-muted">{String(label)}</p>
                <p className="mt-2 text-3xl font-semibold tracking-tight">{String(value)}</p>
              </div>
            );
          })}
        </section>

        <section className="mt-6 rounded-3xl border bg-white p-6 shadow-sm md:p-8">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">Actual versus naive context</h2>
              <p className="mt-1 text-sm text-muted">Same task, model, and output target. Input scope is the only intended difference.</p>
            </div>
            <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${data.measurement === "measured" ? "bg-brand-soft text-brand" : "bg-amber-50 text-amber-800"}`}>
              {data.measurement}
            </span>
          </div>
          <div className="mt-9 space-y-7">
            <div>
              <div className="mb-2 flex justify-between text-sm"><span className="font-medium">Relevant facts only</span><span>{data.actualTokens.toLocaleString()} tokens</span></div>
              <div className="h-5 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-brand" style={{ width: `${Math.max((data.actualTokens / maxTokens) * 100, 3)}%` }} /></div>
            </div>
            <div>
              <div className="mb-2 flex justify-between text-sm"><span className="font-medium">Naive full profile</span><span>{data.naiveTokens.toLocaleString()} tokens</span></div>
              <div className="h-5 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-[#d8b66c]" style={{ width: `${(data.naiveTokens / maxTokens) * 100}%` }} /></div>
            </div>
          </div>
          <div className="mt-9 grid gap-4 border-t pt-6 sm:grid-cols-3">
            <div><p className="text-xs text-muted">Optimized cost</p><p className="mt-1 font-mono text-sm">${data.actualCost.toFixed(6)}</p></div>
            <div><p className="text-xs text-muted">Naive cost</p><p className="mt-1 font-mono text-sm">${data.naiveCost.toFixed(6)}</p></div>
            <div><p className="text-xs text-muted">EverOS restores</p><p className="mt-1 font-mono text-sm">{data.memoryHits}</p></div>
          </div>
        </section>

        <p className="mt-5 text-xs leading-5 text-muted">Pricing assumptions are dated in the repository configuration. Provider-reported token usage is marked measured; character-based estimates are marked projected.</p>
      </div>
    </div>
  );
}
