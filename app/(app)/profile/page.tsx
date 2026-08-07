"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Check,
  CircleHelp,
  Database,
  ExternalLink,
  Pencil,
  RefreshCw,
  Trash2,
} from "lucide-react";
import { useProfile } from "@/components/profile-provider";
import { profileSchema } from "@/lib/domain/profile";
import {
  getHistoryCompletion,
  historyAreas,
} from "@/lib/profile/completeness";
import { getDocumentFile } from "@/lib/profile/document-store";

const goalLabels: Record<string, string> = {
  STILL_EXPLORING: "Still exploring / not sure yet",
  MAINTAIN_STATUS: "Maintain current situation",
  STEM_EXTENSION: "Plan STEM OPT extension",
  H1B_TRANSITION: "H-1B or work-status transition",
  EB2_NIW: "Employment-based permanent residence",
};

function displayField(
  field: { state: "known"; value: unknown } | { state: "unknown" },
  labels?: Record<string, string>,
) {
  if (field.state === "unknown") return "Needs review";
  if (typeof field.value === "boolean") return field.value ? "Yes" : "No";
  if (Array.isArray(field.value)) return field.value.join(", ");
  const raw = String(field.value);
  if (labels?.[raw]) return labels[raw];
  return raw.replaceAll("_", " ");
}

export default function ProfilePage() {
  const router = useRouter();
  const {
    ready,
    profile,
    everosSynced,
    isDemoProfile,
    deleteProfile,
    saveProfile,
  } = useProfile();
  const [restoreStatus, setRestoreStatus] = useState("");
  const [checkingBackup, setCheckingBackup] = useState(false);
  if (!ready) {
    return (
      <div className="px-6 py-9 text-sm text-muted">Loading your local profile…</div>
    );
  }

  const location =
    profile.physicalLocation.state === "known"
      ? profile.physicalLocation.value
      : null;
  const basis =
    profile.currentBasis.state === "known" ? profile.currentBasis.value : null;
  const facts: string[][] = [
    ["Citizenship", displayField(profile.citizenshipCountries)],
    ["Date of birth", displayField(profile.dateOfBirth)],
    ["Country of birth", displayField(profile.countryOfBirth)],
    ["City of birth", displayField(profile.cityOfBirth)],
    ["Marital status", displayField(profile.maritalStatus)],
    ["Dependents", displayField(profile.dependentCount)],
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
    ["Current focus", displayField(profile.immediateGoal, goalLabels)],
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
  const history = getHistoryCompletion(profile);

  async function removeHistoryEvent(eventId: string) {
    if (!window.confirm("Remove this history event from your profile?")) return;
    await saveProfile({
      ...profile,
      profileVersion: profile.profileVersion + 1,
      updatedAt: new Date().toISOString(),
      historyEvents: profile.historyEvents.filter(
        (item) => item.id !== eventId,
      ),
    });
  }

  async function openSavedDocument(documentId: string) {
    const blob = await getDocumentFile(profile.userId, documentId);
    if (!blob) {
      window.alert("This local document is no longer available.");
      return;
    }
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank", "noopener,noreferrer");
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
  }

  async function checkEverOSBackup() {
    setCheckingBackup(true);
    setRestoreStatus("");
    try {
      const response = await fetch("/api/everos/restore", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ localProfile: profile }),
      });
      const body = (await response.json()) as {
        relation?: "remote_newer" | "local_newer" | "same";
        remoteProfile?: unknown;
        error?: string;
      };
      if (!response.ok || !body.relation) {
        throw new Error(body.error ?? "Could not check the memory backup");
      }
      if (body.relation === "remote_newer") {
        const remote = profileSchema.parse(body.remoteProfile);
        const shouldRestore = window.confirm(
          `EverOS has a newer profile from ${new Date(remote.updatedAt).toLocaleString()}. Replace local profile facts with that version? Local document files will be kept.`,
        );
        if (!shouldRestore) {
          setRestoreStatus("Newer memory backup found; local profile kept.");
          return;
        }
        await saveProfile(
          { ...remote, documents: profile.documents },
          { syncEverOS: false },
        );
        setRestoreStatus("Restored the newer structured profile from EverOS.");
      } else if (body.relation === "local_newer") {
        setRestoreStatus(
          "This device has the newer profile. The background sync will update EverOS.",
        );
      } else {
        setRestoreStatus("Local profile and EverOS memory are already aligned.");
      }
    } catch (error) {
      setRestoreStatus(
        error instanceof Error
          ? error.message
          : "Could not check the memory backup.",
      );
    } finally {
      setCheckingBackup(false);
    }
  }

  return (
    <div className="px-6 py-9 md:px-12">
      <div className="mx-auto max-w-5xl">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand">
              Your profile
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight">
              {profile.displayName}
            </h1>
            <p className="mt-2 text-sm text-muted">
              Profile version {profile.profileVersion} · Updated{" "}
              {new Date(profile.updatedAt).toLocaleDateString()}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {!isDemoProfile && (
              <button
                type="button"
                disabled={checkingBackup}
                onClick={() => void checkEverOSBackup()}
                className="inline-flex items-center gap-2 rounded-xl border bg-white px-4 py-2.5 text-sm font-semibold disabled:opacity-50"
              >
                <RefreshCw
                  className={`size-4 ${checkingBackup ? "animate-spin" : ""}`}
                />
                {checkingBackup ? "Checking memory…" : "Check memory backup"}
              </button>
            )}
            <Link
              href={isDemoProfile ? "/onboarding" : "/onboarding?edit=1"}
              className="rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white"
            >
              Update current facts
            </Link>
          </div>
        </header>
        {restoreStatus && (
          <p className="mt-4 rounded-xl border bg-white px-4 py-3 text-xs text-muted">
            {restoreStatus}
          </p>
        )}

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
                {history.percentage}% reviewed
              </span>
            </div>
            <div className="mt-6 space-y-5 border-l pl-5">
              {profile.historyEvents.map((event) => (
                <div key={event.id} className="relative">
                  <span className="absolute -left-[27px] top-1.5 size-3 rounded-full border-2 border-white bg-brand" />
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs text-muted">
                        {event.date ?? "Date not confirmed"}
                      </p>
                      <p className="mt-1 text-sm font-semibold">
                        {event.title}
                      </p>
                      {event.details && (
                        <p className="mt-1 text-xs leading-5 text-muted">
                          {event.details}
                        </p>
                      )}
                      <p className="mt-1 text-xs capitalize text-muted">
                        {event.type.replace("_", " ")} · {event.confidence}
                      </p>
                    </div>
                    {!isDemoProfile && (
                      <div className="flex gap-1">
                        <button
                          type="button"
                          aria-label={`Edit ${event.title}`}
                          onClick={() =>
                            router.push(
                              `/history?event=${encodeURIComponent(event.id)}`,
                            )
                          }
                          className="rounded-lg p-2 text-muted hover:bg-slate-100 hover:text-brand"
                        >
                          <Pencil className="size-3.5" />
                        </button>
                        <button
                          type="button"
                          aria-label={`Remove ${event.title}`}
                          onClick={() => void removeHistoryEvent(event.id)}
                          className="rounded-lg p-2 text-muted hover:bg-rose-50 hover:text-rose-700"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {profile.historyEvents.length === 0 && (
                <p className="text-sm text-muted">
                  No timeline events confirmed yet.
                </p>
              )}
            </div>
            <Link
              href="/history"
              className="mt-7 inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-xs font-semibold"
            >
              Review or add history <ArrowRight className="size-3.5" />
            </Link>
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

        {profile.documents.length > 0 && (
          <section className="mt-6 rounded-3xl border bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="font-semibold">Saved documents</h2>
                <p className="mt-1 text-xs text-muted">
                  Files are stored locally on this device. Extracted facts still
                  require your confirmation.
                </p>
              </div>
              <Link
                href="/history"
                className="text-xs font-semibold text-brand hover:underline"
              >
                Open history interview
              </Link>
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {profile.documents.map((document) => (
                <div key={document.id} className="rounded-2xl border p-4">
                  <div className="flex items-start justify-between gap-3">
                    <p className="truncate text-sm font-semibold">
                      {document.name}
                    </p>
                    <button
                      type="button"
                      aria-label={`Open ${document.name}`}
                      onClick={() => void openSavedDocument(document.id)}
                      className="rounded-lg p-1.5 text-muted hover:bg-slate-100 hover:text-brand"
                    >
                      <ExternalLink className="size-3.5" />
                    </button>
                  </div>
                  <p className="mt-1 text-xs capitalize text-muted">
                    {document.category.replace(/([A-Z])/g, " $1")} ·{" "}
                    {document.analysisStatus}
                  </p>
                  {document.summary && (
                    <p className="mt-2 text-xs leading-5 text-muted">
                      {document.summary}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        <section className="mt-6 rounded-3xl border bg-white p-6 shadow-sm">
          <h2 className="font-semibold">Review progress</h2>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {historyAreas.map((area) => {
              const state = profile.historyReview[area.id];
              const reviewed = state === "reviewed";
              const ItemIcon = reviewed ? Check : CircleHelp;
              return (
                <div key={area.id} className="rounded-2xl border p-4">
                  <span
                    className={`grid size-8 place-items-center rounded-lg ${
                      reviewed
                        ? "bg-brand-soft text-brand"
                        : "bg-amber-50 text-amber-700"
                    }`}
                  >
                    <ItemIcon className="size-4" />
                  </span>
                  <p className="mt-3 text-sm font-semibold">{area.label}</p>
                  <p className="mt-1 text-xs capitalize text-muted">
                    {state.replace("_", " ")}
                  </p>
                </div>
              );
            })}
          </div>
        </section>

        {!isDemoProfile && (
          <section className="mt-6 rounded-3xl border border-rose-200 bg-rose-50/40 p-6">
            <h2 className="font-semibold text-rose-950">Delete this profile</h2>
            <p className="mt-2 max-w-2xl text-sm text-rose-900/70">
              Removes this profile from this device. Demo profiles like Maya and
              Daniel stay available.
            </p>
            <button
              type="button"
              className="mt-4 inline-flex items-center gap-2 rounded-xl border border-rose-300 bg-white px-4 py-2.5 text-sm font-semibold text-rose-800 hover:bg-rose-50"
              onClick={() => {
                if (
                  !window.confirm(
                    "Delete this profile from this device? This cannot be undone.",
                  )
                ) {
                  return;
                }
                void deleteProfile().then(() => {
                  router.push("/runway");
                  router.refresh();
                });
              }}
            >
              <Trash2 className="size-4" />
              Delete profile
            </button>
          </section>
        )}
      </div>
    </div>
  );
}
