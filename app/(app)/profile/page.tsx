"use client";

import Link from "next/link";
import { ArrowRight, Check, CircleHelp, Clock3, Database } from "lucide-react";
import { useProfile } from "@/components/profile-provider";

function displayField(field: { state: "known"; value: unknown } | { state: "unknown" }) {
  if (field.state === "unknown") return "Needs review";
  if (typeof field.value === "boolean") return field.value ? "Yes" : "No";
  return String(field.value).replaceAll("_", " ");
}

export default function ProfilePage() {
  const { ready, profile, everosSynced } = useProfile();
  if (!ready) {
    return <div className="px-6 py-9 text-sm text-muted">Loading your local profile…</div>;
  }

  const location =
    profile.physicalLocation.state === "known"
      ? profile.physicalLocation.value
      : null;
  const basis =
    profile.currentBasis.state === "known" ? profile.currentBasis.value : null;
  const facts: string[][] = [
    ["Physical location", displayField(profile.physicalLocation)],
  ];
  if (location === "IN_US") {
    facts.push(["Current U.S. basis", displayField(profile.currentBasis)]);
  }
  if (basis === "NONIMMIGRANT_STATUS") {
    facts.push([
      "Current status/classification",
      displayField(profile.currentStatus),
    ]);
  }
  if (basis === "WORKER_GRACE_PERIOD") {
    facts.push(
      ["Prior classification", displayField(profile.priorStatus)],
      ["Employment ended", displayField(profile.employmentEndDate)],
    );
  }
  if (location === "OUTSIDE_US") {
    facts.push([
      "Target classification",
      displayField(profile.targetClassification),
    ]);
  }
  if (
    profile.f1Stage.state === "known" &&
    profile.f1Stage.value !== "NOT_APPLICABLE"
  ) {
    facts.push(["F-1 program or training stage", displayField(profile.f1Stage)]);
  }
  facts.push(
    ["Valid until", displayField(profile.validUntil)],
    ["Immediate goal", displayField(profile.immediateGoal)],
    [
      "Pending or approved cases",
      profile.pendingCases.length
        ? profile.pendingCases
            .map(
              (item) =>
                `${item.type.replace("I", "I-")} ${item.status.toLowerCase()}`,
            )
            .join(", ")
        : "None recorded",
    ],
    ["Planned travel", displayField(profile.plannedTravel)],
  );

  return (
    <div className="px-6 py-9 md:px-12">
      <div className="mx-auto max-w-5xl">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand">
              Your profile
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight">{profile.displayName}</h1>
            <p className="mt-2 text-sm text-muted">
              Profile version {profile.profileVersion} · Updated{" "}
              {new Date(profile.updatedAt).toLocaleDateString()}
            </p>
          </div>
          <Link
            href="/onboarding"
            className="rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white"
          >
            Update current facts
          </Link>
        </header>

        <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_0.85fr]">
          <section className="rounded-3xl border bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">Facts Continuum remembers</h2>
              <span className="inline-flex items-center gap-1.5 text-xs text-muted">
                <Database className="size-3.5" />{" "}
                {everosSynced ? "Memory synced" : "Profile saved"}
              </span>
            </div>
            <dl className="mt-5 divide-y">
              {facts.map(([label, value]) => (
                <div
                  key={label}
                  className="flex items-center justify-between gap-5 py-3.5 text-sm"
                >
                  <dt className="text-muted">{label}</dt>
                  <dd className="text-right font-medium">{value}</dd>
                </div>
              ))}
            </dl>
          </section>

          <section className="rounded-3xl border bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">History builder</h2>
              <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-800">
                {profile.historyCompleteness.replace("_", " ")}
              </span>
            </div>
            <div className="mt-6 space-y-5 border-l pl-5">
              {profile.historyEvents.map((event) => (
                <div key={event.id} className="relative">
                  <span className="absolute -left-[27px] top-1.5 size-3 rounded-full border-2 border-white bg-brand" />
                  <p className="text-xs text-muted">{event.date}</p>
                  <p className="mt-1 text-sm font-semibold">{event.title}</p>
                  <p className="mt-1 text-xs capitalize text-muted">
                    {event.type} · {event.confidence}
                  </p>
                </div>
              ))}
            </div>
            <button className="mt-7 inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-xs font-semibold">
              Add another event <ArrowRight className="size-3.5" />
            </button>
          </section>
        </div>

        {profile.aosDetails && (
          <section className="mt-6 rounded-3xl border bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">Adjustment of status</h2>
              <span className="rounded-full bg-brand-soft px-2.5 py-1 text-[11px] font-semibold text-brand">
                I-485 tracked separately
              </span>
            </div>
            <dl className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[
                ["Basis", displayField(profile.aosDetails.basis)],
                ["Case stage", displayField(profile.aosDetails.stage)],
                ["Receipt date", displayField(profile.aosDetails.receiptDate)],
                ["Priority date", displayField(profile.aosDetails.priorityDate)],
                ["Adjustment EAD", displayField(profile.aosDetails.eadState)],
                [
                  "Advance parole",
                  displayField(profile.aosDetails.advanceParoleState),
                ],
              ].map(([label, value]) => (
                <div key={label} className="rounded-2xl bg-slate-50 p-4">
                  <dt className="text-xs text-muted">{label}</dt>
                  <dd className="mt-1 text-sm font-semibold">{value}</dd>
                </div>
              ))}
            </dl>
          </section>
        )}

        <section className="mt-6 rounded-3xl border bg-white p-6 shadow-sm">
          <h2 className="font-semibold">Review progress</h2>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            {[
              [Check, "Current status", "Reviewed", "text-brand bg-brand-soft"],
              [CircleHelp, "Travel", "Needs review", "text-amber-700 bg-amber-50"],
              [Clock3, "Petitions & notices", "Ask me later", "text-slate-600 bg-slate-100"],
            ].map(([Icon, title, state, style]) => {
              const ItemIcon = Icon as typeof Check;
              return (
                <div key={String(title)} className="rounded-2xl border p-4">
                  <span className={`grid size-8 place-items-center rounded-lg ${style}`}>
                    <ItemIcon className="size-4" />
                  </span>
                  <p className="mt-3 text-sm font-semibold">{String(title)}</p>
                  <p className="mt-1 text-xs text-muted">{String(state)}</p>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}
