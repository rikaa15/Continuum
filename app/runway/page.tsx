import Link from "next/link";
import {
  ArrowRight,
  Bell,
  CalendarClock,
  CheckCircle2,
  CircleAlert,
  Database,
  Plane,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { getProfile } from "@/lib/profile/service";
import { evaluateRule } from "@/lib/rules/evaluate";
import { studentPolicyRule } from "@/lib/rules/fixtures/student-policy";

function valueOf<T>(field: { state: "known"; value: T } | { state: "unknown" }) {
  return field.state === "known" ? field.value : null;
}

export default async function RunwayPage() {
  const { profile, source, message } = await getProfile();
  const decision = evaluateRule(studentPolicyRule, profile);
  const currentStatus =
    valueOf(profile.currentStatus)?.replaceAll("_", " ") ?? "Needs review";
  const f1Stage = valueOf(profile.f1Stage);
  const context =
    currentStatus === "F1" && f1Stage && f1Stage !== "NOT_APPLICABLE"
      ? `F-1 · ${f1Stage.replaceAll("_", " ")}`
      : currentStatus;
  const deadline = valueOf(profile.nextKnownDeadline);
  const travel = valueOf(profile.plannedTravel);
  const completed = profile.evidenceCriteria.filter((item) => item.state === "met").length;

  return (
    <div className="px-6 py-9 md:px-12">
      <div className="mx-auto max-w-6xl">
        <header className="flex flex-wrap items-start justify-between gap-5">
          <div>
            <p className="text-sm text-muted">Friday, August 7</p>
            <h1 className="mt-1 text-3xl font-semibold tracking-tight">
              Welcome back, {profile.displayName.split(" ")[0]}.
            </h1>
            <p className="mt-2 text-muted">Here is what deserves your attention today.</p>
          </div>
          <div className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${source === "everos" ? "bg-brand-soft text-brand" : "bg-amber-50 text-amber-800"}`}>
            <Database className="mr-1.5 inline size-3.5" />
            {source === "everos" ? "Remembered by EverOS" : "Seeded demo fallback"}
          </div>
        </header>

        {message && (
          <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-900">
            {message} The fallback is disclosed and should not be used as submission evidence.
          </div>
        )}

        <section className="mt-8 grid gap-5 lg:grid-cols-[1.45fr_0.75fr]">
          <div className="rounded-3xl bg-[#183e35] p-7 text-white shadow-xl shadow-emerald-950/10">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs font-semibold uppercase tracking-[0.17em] text-emerald-100/65">
                Current runway
              </p>
              <span className="rounded-full bg-white/10 px-3 py-1 text-xs">
                History {profile.historyCompleteness.replace("_", " ")}
              </span>
            </div>
            <div className="mt-8 flex flex-wrap items-end justify-between gap-6">
              <div>
                <p className="text-4xl font-semibold">{context}</p>
                <p className="mt-2 text-sm text-emerald-100/65">
                  Valid through {valueOf(profile.validUntil) ? format(parseISO(valueOf(profile.validUntil)!), "MMM d, yyyy") : "unknown"}
                </p>
              </div>
              <Link href="/profile" className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-[#183e35] hover:bg-emerald-50">
                Complete history <ArrowRight className="size-4" />
              </Link>
            </div>
            <div className="mt-8 h-1.5 overflow-hidden rounded-full bg-white/10">
              <div className="h-full w-[68%] rounded-full bg-[#8fd1b8]" />
            </div>
            <p className="mt-2 text-xs text-emerald-100/55">Profile is 68% reviewed</p>
          </div>

          <div className="rounded-3xl border bg-white p-6 shadow-sm">
            <div className="flex size-10 items-center justify-center rounded-xl bg-warm text-amber-900">
              <CalendarClock className="size-5" />
            </div>
            <p className="mt-5 text-xs font-semibold uppercase tracking-[0.16em] text-muted">Next milestone</p>
            <p className="mt-2 text-xl font-semibold">
              {deadline ? format(parseISO(deadline), "MMMM d, yyyy") : "Date needs review"}
            </p>
            <p className="mt-2 text-sm leading-6 text-muted">User-entered deadline. Confirm it with your DSO or attorney.</p>
          </div>
        </section>

        <section className="mt-7 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          <Link href={`/alerts/${studentPolicyRule.ruleId}`} className="group rounded-2xl border bg-white p-5 shadow-sm hover:-translate-y-0.5 hover:border-brand/30">
            <div className="flex items-start justify-between">
              <span className="grid size-9 place-items-center rounded-xl bg-brand-soft text-brand"><Bell className="size-4" /></span>
              <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${decision.decision === "affected" ? "bg-rose-50 text-rose-700" : decision.decision === "needs_review" ? "bg-amber-50 text-amber-800" : "bg-slate-100 text-slate-700"}`}>
                {decision.decision.replace("_", " ")}
              </span>
            </div>
            <h2 className="mt-5 font-semibold">{studentPolicyRule.title}</h2>
            <p className="mt-2 text-sm leading-6 text-muted">See the exact profile facts behind this result.</p>
            <span className="mt-5 inline-flex items-center gap-1 text-xs font-semibold text-brand">Open alert <ArrowRight className="size-3.5" /></span>
          </Link>

          <div className="rounded-2xl border bg-white p-5 shadow-sm">
            <span className="grid size-9 place-items-center rounded-xl bg-sky-50 text-sky-700"><Plane className="size-4" /></span>
            <h2 className="mt-5 font-semibold">{travel ? "Travel plan needs a review" : "No travel recorded"}</h2>
            <p className="mt-2 text-sm leading-6 text-muted">{travel ? "Check documents and re-entry requirements with a qualified adviser." : "Update your profile when plans change."}</p>
          </div>

          <div className="rounded-2xl border bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between">
              <span className="grid size-9 place-items-center rounded-xl bg-violet-50 text-violet-700"><CheckCircle2 className="size-4" /></span>
              <span className="text-xs text-muted">{completed}/{profile.evidenceCriteria.length} ready</span>
            </div>
            <h2 className="mt-5 font-semibold">Case-building preview</h2>
            <div className="mt-3 space-y-2">
              {profile.evidenceCriteria.slice(0, 2).map((item) => (
                <div key={item.id} className="flex items-center gap-2 text-xs text-muted">
                  {item.state === "met" ? <CheckCircle2 className="size-3.5 text-brand" /> : <CircleAlert className="size-3.5 text-amber-600" />}
                  {item.label}
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
