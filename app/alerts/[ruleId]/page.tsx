import { createHash, randomUUID } from "node:crypto";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowUpRight,
  Check,
  CircleHelp,
  Database,
  ShieldCheck,
} from "lucide-react";
import { notFound } from "next/navigation";
import { markEmployerUnknown } from "@/app/actions";
import { explainDecision } from "@/lib/ai/explain";
import { getProfile } from "@/lib/profile/service";
import { evaluateRule } from "@/lib/rules/evaluate";
import { studentPolicyRule } from "@/lib/rules/fixtures/student-policy";
import { writeLedger } from "@/lib/snowflake/client";

const states = {
  affected: {
    eyebrow: "Action recommended",
    title: "This check applies to your profile.",
    icon: AlertTriangle,
    color: "bg-rose-50 text-rose-800 border-rose-200",
  },
  not_affected: {
    eyebrow: "No action for this alert",
    title: "This check does not apply to your profile.",
    icon: ShieldCheck,
    color: "bg-emerald-50 text-emerald-800 border-emerald-200",
  },
  needs_review: {
    eyebrow: "More information needed",
    title: "We need one fact before deciding.",
    icon: CircleHelp,
    color: "bg-amber-50 text-amber-900 border-amber-200",
  },
};

export default async function AlertDetailPage({
  params,
}: {
  params: Promise<{ ruleId: string }>;
}) {
  const { ruleId } = await params;
  if (ruleId !== studentPolicyRule.ruleId) notFound();

  const { profile, source } = await getProfile();
  const result = evaluateRule(studentPolicyRule, profile);
  const explanationRun = await explainDecision(result, studentPolicyRule, profile);
  result.explanation = explanationRun.explanation;
  const pseudonymousUserId = createHash("sha256")
    .update(`continuum:${profile.userId}`)
    .digest("hex")
    .slice(0, 16);
  try {
    await writeLedger({
      runId: randomUUID(),
      pseudonymousUserId,
      result,
      optimized: explanationRun.optimizedUsage,
      baseline: explanationRun.baselineUsage,
      memorySource: source,
    });
  } catch {
    // The result remains available if economics telemetry is unavailable.
  }

  const state = states[result.decision];
  const StateIcon = state.icon;

  return (
    <div className="px-6 py-9 md:px-12">
      <div className="mx-auto max-w-5xl">
        <Link href="/runway" className="inline-flex items-center gap-2 text-sm font-semibold text-muted hover:text-brand">
          <ArrowLeft className="size-4" /> Back to runway
        </Link>

        <div className={`mt-7 rounded-3xl border p-7 ${state.color}`}>
          <div className="flex flex-wrap items-start justify-between gap-5">
            <div className="flex gap-4">
              <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-white/70">
                <StateIcon className="size-6" />
              </span>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em]">{state.eyebrow}</p>
                <h1 className="mt-2 text-3xl font-semibold tracking-tight">{state.title}</h1>
                <p className="mt-3 max-w-2xl text-sm leading-6 opacity-80">{result.explanation}</p>
              </div>
            </div>
            <span className="rounded-full bg-white/65 px-3 py-1.5 text-xs font-semibold">
              {result.decision.replace("_", " ")}
            </span>
          </div>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-[1.25fr_0.75fr]">
          <div className="space-y-6">
            <section className="rounded-2xl border bg-white p-6 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">Why Continuum reached this result</p>
              <div className="mt-5 space-y-3">
                {result.matchedFacts.map((fact) => (
                  <div key={`${fact.field}-${fact.statement}`} className="flex gap-3 rounded-xl bg-brand-soft p-3.5">
                    <Check className="mt-0.5 size-4 shrink-0 text-brand" />
                    <div>
                      <p className="text-sm font-medium">{fact.statement}</p>
                      <p className="mt-0.5 text-xs text-muted">Remembered field: {fact.field}</p>
                    </div>
                  </div>
                ))}
                {result.missingFacts.map((fact) => (
                  <div key={fact.field} className="flex gap-3 rounded-xl bg-amber-50 p-3.5">
                    <CircleHelp className="mt-0.5 size-4 shrink-0 text-amber-700" />
                    <div>
                      <p className="text-sm font-medium">{fact.reason}</p>
                      <p className="mt-0.5 text-xs text-muted">Missing field: {fact.field}</p>
                    </div>
                  </div>
                ))}
                {result.matchedFacts.length === 0 && result.missingFacts.length === 0 && (
                  <p className="text-sm text-muted">{result.decisionReasons[0]}</p>
                )}
              </div>
            </section>

            <section className="rounded-2xl border bg-white p-6 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">Your next step</p>
              <p className="mt-3 text-lg font-semibold">{result.recommendedAction}</p>
              <p className="mt-3 text-sm text-muted">Escalate to: {result.escalationTarget}</p>
              {result.decision === "affected" && (
                <form action={markEmployerUnknown} className="mt-5">
                  <button className="rounded-xl border px-4 py-2.5 text-xs font-semibold hover:border-brand/30">
                    Demo uncertainty: mark E-Verify unknown
                  </button>
                </form>
              )}
            </section>
          </div>

          <aside className="space-y-6">
            <section className="rounded-2xl border bg-white p-6 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">Rule record</p>
              <dl className="mt-5 space-y-4 text-sm">
                <div><dt className="text-xs text-muted">Stage</dt><dd className="mt-1 font-medium capitalize">{studentPolicyRule.stage}</dd></div>
                <div><dt className="text-xs text-muted">As of</dt><dd className="mt-1 font-medium">{studentPolicyRule.asOfDate}</dd></div>
                <div><dt className="text-xs text-muted">Rule version</dt><dd className="mt-1 font-mono text-xs">{studentPolicyRule.version}</dd></div>
                <div><dt className="text-xs text-muted">Review status</dt><dd className="mt-1 font-medium">{studentPolicyRule.reviewedByCounsel ? "Counsel reviewed" : "Not counsel reviewed"}</dd></div>
              </dl>
              <a href={studentPolicyRule.sourceUrl} target="_blank" rel="noreferrer" className="mt-6 inline-flex items-center gap-1 text-xs font-semibold text-brand">
                Authoritative source <ArrowUpRight className="size-3.5" />
              </a>
            </section>
            <section className="rounded-2xl border bg-[#f3f0e7] p-5 text-sm">
              <Database className="size-4 text-brand" />
              <p className="mt-3 font-semibold">{source === "everos" ? "Facts retrieved from EverOS" : "Seeded fallback facts"}</p>
              <p className="mt-2 text-xs leading-5 text-muted">
                Profile v{profile.profileVersion} · Rule v{studentPolicyRule.version}. This fixture is a demonstration and is not legal advice.
              </p>
            </section>
          </aside>
        </div>
      </div>
    </div>
  );
}
