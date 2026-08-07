"use client";

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
import { useProfile } from "@/components/profile-provider";
import { getHistoryCompletion } from "@/lib/profile/completeness";
import { evaluateRule } from "@/lib/rules/evaluate";
import { studentPolicyRule } from "@/lib/rules/fixtures/student-policy";

function valueOf<T>(field: { state: "known"; value: T } | { state: "unknown" }) {
  return field.state === "known" ? field.value : null;
}

export default function RunwayPage() {
  const { ready, profile, everosSynced } = useProfile();
  if (!ready) {
    return <div className="px-6 py-9 text-sm text-muted">Loading your local profile…</div>;
  }

  const decision = evaluateRule(studentPolicyRule, profile);
  const location = valueOf(profile.physicalLocation);
  const basis = valueOf(profile.currentBasis);
  const currentStatus = valueOf(profile.currentStatus);
  const priorStatus = valueOf(profile.priorStatus);
  const targetClassification = valueOf(profile.targetClassification);
  const f1Stage = valueOf(profile.f1Stage);
  const context =
    location === "OUTSIDE_US"
      ? `Exploring ${targetClassification?.replaceAll("_", " ") ?? "a U.S. pathway"}`
      : basis === "WORKER_GRACE_PERIOD"
        ? `${priorStatus?.replaceAll("_", " ") ?? "Worker"} · grace period`
        : basis === "PENDING_ADJUSTMENT_ONLY"
          ? "Adjustment pending"
          : basis === "PERMANENT_RESIDENT"
            ? "Lawful permanent resident"
            : currentStatus === "F1" &&
                f1Stage &&
                f1Stage !== "NOT_APPLICABLE"
              ? `F-1 · ${f1Stage.replaceAll("_", " ")}`
              : currentStatus?.replaceAll("_", " ") ??
                basis?.replaceAll("_", " ") ??
                "Needs review";
  const deadline = valueOf(profile.nextKnownDeadline);
  const travel = valueOf(profile.plannedTravel);
  const completed = profile.evidenceCriteria.filter((item) => item.state === "met").length;
  const history = getHistoryCompletion(profile);

  return (
    <div className="px-6 py-9 md:px-12">
      <div className="mx-auto max-w-6xl">
        <header className="flex flex-wrap items-start justify-between gap-5">
          <div>
            <p className="text-sm text-muted">
              {format(new Date(), "EEEE, MMMM d")}
            </p>
            <h1 className="mt-1 text-3xl font-semibold tracking-tight">
              Welcome back, {profile.displayName.split(" ")[0]}.
            </h1>
            <p className="mt-2 text-muted">Here is what deserves your attention today.</p>
          </div>
          <div className="rounded-full border bg-brand-soft px-3 py-1.5 text-xs font-semibold text-brand">
            <Database className="mr-1.5 inline size-3.5" />
            {everosSynced ? "Memory synced" : "Profile saved"}
          </div>
        </header>

        <section className="mt-8 grid gap-5 lg:grid-cols-[1.45fr_0.75fr]">
          <div className="rounded-3xl bg-[#183e35] p-7 text-white shadow-xl shadow-emerald-950/10">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs font-semibold uppercase tracking-[0.17em] text-emerald-100/65">
                Current runway
              </p>
              <span className="rounded-full bg-white/10 px-3 py-1 text-xs">
                History {history.status.replace("_", " ")}
              </span>
            </div>
            <div className="mt-8 flex flex-wrap items-end justify-between gap-6">
              <div>
                <p className="text-4xl font-semibold">{context}</p>
                <p className="mt-2 text-sm text-emerald-100/65">
                  {location === "OUTSIDE_US"
                    ? "Planning from outside the United States"
                    : valueOf(profile.validUntil)
                      ? `Validity date: ${format(parseISO(valueOf(profile.validUntil)!), "MMM d, yyyy")}`
                      : `${basis?.replaceAll("_", " ") ?? "Current basis"} · date needs review`}
                </p>
              </div>
              <Link
                href="/history"
                className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-[#183e35] hover:bg-emerald-50"
              >
                {history.nextArea
                  ? `Review ${history.nextArea.label.toLowerCase()}`
                  : "Review history"}{" "}
                <ArrowRight className="size-4" />
              </Link>
            </div>
            <div className="mt-8 h-1.5 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-[#8fd1b8]"
                style={{ width: `${history.percentage}%` }}
              />
            </div>
            <p className="mt-2 text-xs text-emerald-100/55">
              {history.reviewed} of {history.total} history areas reviewed ·{" "}
              {history.percentage}%
            </p>
          </div>

          <div className="rounded-3xl border bg-white p-6 shadow-sm">
            <div className="flex size-10 items-center justify-center rounded-xl bg-warm text-amber-900">
              <CalendarClock className="size-5" />
            </div>
            <p className="mt-5 text-xs font-semibold uppercase tracking-[0.16em] text-muted">
              Next milestone
            </p>
            <p className="mt-2 text-xl font-semibold">
              {deadline ? format(parseISO(deadline), "MMMM d, yyyy") : "Date needs review"}
            </p>
            <p className="mt-2 text-sm leading-6 text-muted">
              User-entered deadline. Confirm it with your DSO or attorney.
            </p>
          </div>
        </section>

        <section className="mt-7 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          <Link
            href={`/alerts/${studentPolicyRule.ruleId}`}
            className="group rounded-2xl border bg-white p-5 shadow-sm hover:-translate-y-0.5 hover:border-brand/30"
          >
            <div className="flex items-start justify-between">
              <span className="grid size-9 place-items-center rounded-xl bg-brand-soft text-brand">
                <Bell className="size-4" />
              </span>
              <span
                className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                  decision.decision === "affected"
                    ? "bg-rose-50 text-rose-700"
                    : decision.decision === "needs_review"
                      ? "bg-amber-50 text-amber-800"
                      : "bg-slate-100 text-slate-700"
                }`}
              >
                {decision.decision.replace("_", " ")}
              </span>
            </div>
            <h2 className="mt-5 font-semibold">{studentPolicyRule.title}</h2>
            <p className="mt-2 text-sm leading-6 text-muted">
              See the exact profile facts behind this result.
            </p>
            <span className="mt-5 inline-flex items-center gap-1 text-xs font-semibold text-brand">
              Open alert <ArrowRight className="size-3.5" />
            </span>
          </Link>

          <div className="rounded-2xl border bg-white p-5 shadow-sm">
            <span className="grid size-9 place-items-center rounded-xl bg-sky-50 text-sky-700">
              <Plane className="size-4" />
            </span>
            <h2 className="mt-5 font-semibold">
              {profile.pendingCases.length > 0
                ? `${profile.pendingCases.length} pending or approved case${profile.pendingCases.length === 1 ? "" : "s"}`
                : travel
                  ? "Travel plan needs a review"
                  : "No pending cases recorded"}
            </h2>
            <p className="mt-2 text-sm leading-6 text-muted">
              {profile.pendingCases.length > 0
                ? profile.pendingCases
                    .map(
                      (item) =>
                        `${item.type.replace("I", "I-")} ${item.status.toLowerCase()}`,
                    )
                    .join(" · ")
                : travel
                  ? "Check documents and re-entry requirements with a qualified adviser."
                  : "Update your profile when plans change."}
            </p>
          </div>

          <div className="rounded-2xl border bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between">
              <span className="grid size-9 place-items-center rounded-xl bg-violet-50 text-violet-700">
                <CheckCircle2 className="size-4" />
              </span>
              <span className="text-xs text-muted">
                {completed}/{profile.evidenceCriteria.length} ready
              </span>
            </div>
            <h2 className="mt-5 font-semibold">Case-building preview</h2>
            <div className="mt-3 space-y-2">
              {profile.evidenceCriteria.slice(0, 2).map((item) => (
                <div key={item.id} className="flex items-center gap-2 text-xs text-muted">
                  {item.state === "met" ? (
                    <CheckCircle2 className="size-3.5 text-brand" />
                  ) : (
                    <CircleAlert className="size-3.5 text-amber-600" />
                  )}
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
