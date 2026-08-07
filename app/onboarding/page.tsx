"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CircleHelp,
  Leaf,
  Sparkles,
} from "lucide-react";
import { useProfile } from "@/components/profile-provider";
import { personaA } from "@/lib/demo/personas";
import {
  currentBasisSchema,
  currentStatusSchema,
  f1StageSchema,
  known,
  physicalLocationSchema,
  unknown,
  type ImmigrationProfile,
} from "@/lib/domain/profile";
import { getHistoryCompletion } from "@/lib/profile/completeness";
import { createLocalUserId } from "@/lib/profile/browser-store";

const inputClass =
  "mt-2 w-full rounded-xl border bg-white px-3.5 py-3 text-sm shadow-sm outline-none hover:border-brand/30";

const supportedStatuses = [
  ["F1", "F-1 · Academic student"],
  ["J1", "J-1 · Exchange visitor"],
  ["H1B", "H-1B · Specialty occupation"],
  ["H1B1", "H-1B1 · Chile or Singapore"],
  ["O1", "O-1 · Extraordinary ability"],
  ["L1", "L-1 · Intracompany transferee"],
  ["TN", "TN · Canadian or Mexican professional"],
  ["E1", "E-1 · Treaty trader"],
  ["E2", "E-2 · Treaty investor"],
  ["E3", "E-3 · Australian professional"],
  ["OTHER", "Other / not sure"],
] as const;

const workerGraceStatuses = [
  ["H1B", "H-1B"],
  ["H1B1", "H-1B1"],
  ["O1", "O-1"],
  ["L1", "L-1"],
  ["TN", "TN"],
  ["E1", "E-1"],
  ["E2", "E-2"],
  ["E3", "E-3"],
] as const;

function dateValue(formData: FormData, name: string, reason: string) {
  const value = String(formData.get(name) ?? "");
  return value ? known(value, "user") : unknown(reason);
}

function fieldValue<T>(
  field: { state: "known"; value: T } | { state: "unknown" },
) {
  return field.state === "known" ? field.value : undefined;
}

export default function OnboardingPage() {
  const router = useRouter();
  const { saveProfile, profile: activeProfile, isDemoProfile } = useProfile();
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [physicalLocation, setPhysicalLocation] = useState<
    "" | "IN_US" | "OUTSIDE_US"
  >("");
  const [currentBasis, setCurrentBasis] = useState("");
  const [currentStatus, setCurrentStatus] = useState("");
  const [f1Stage, setF1Stage] = useState("ENROLLED");
  const [pendingCases, setPendingCases] = useState<string[]>([]);

  useEffect(() => {
    const shouldEdit =
      new URLSearchParams(window.location.search).get("edit") === "1" &&
      !isDemoProfile;
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      setEditing(shouldEdit);
      if (!shouldEdit) return;

      setPhysicalLocation(
        activeProfile.physicalLocation.state === "known"
          ? activeProfile.physicalLocation.value
          : "",
      );
      setCurrentBasis(
        activeProfile.currentBasis.state === "known"
          ? activeProfile.currentBasis.value
          : "",
      );
      setCurrentStatus(
        activeProfile.currentStatus.state === "known"
          ? activeProfile.currentStatus.value
          : "",
      );
      setF1Stage(
        activeProfile.f1Stage.state === "known" &&
          activeProfile.f1Stage.value !== "NOT_APPLICABLE"
          ? activeProfile.f1Stage.value
          : "ENROLLED",
      );
      setPendingCases(activeProfile.pendingCases.map((item) => item.type));
    });
    return () => {
      cancelled = true;
    };
  }, [activeProfile, isDemoProfile]);

  const inUS = physicalLocation === "IN_US";
  const outsideUS = physicalLocation === "OUTSIDE_US";
  const hasUnderlyingStatus =
    inUS && currentBasis === "NONIMMIGRANT_STATUS";
  const inGracePeriod = inUS && currentBasis === "WORKER_GRACE_PERIOD";
  const isF1 = hasUnderlyingStatus && currentStatus === "F1";
  const isH1B = hasUnderlyingStatus && currentStatus === "H1B";
  const needsEVerify =
    isF1 && ["POST_COMPLETION_OPT", "STEM_OPT"].includes(f1Stage);
  const hasI485 = pendingCases.includes("I485");
  const canPlanStemExtension =
    isF1 &&
    ["ENROLLED", "CPT", "POST_COMPLETION_OPT"].includes(f1Stage);

  const goalOptions = useMemo(() => {
    const options = [
      {
        value: "STILL_EXPLORING",
        label: "Still exploring / not sure yet",
      },
      {
        value: "MAINTAIN_STATUS",
        label: "Maintain my current situation",
      },
    ];

    if (canPlanStemExtension) {
      options.push({
        value: "STEM_EXTENSION",
        label: "Plan a STEM OPT extension",
      });
    }

    if (isF1 || inGracePeriod || outsideUS) {
      options.push({
        value: "H1B_TRANSITION",
        label: "Explore an H-1B or work-status transition",
      });
    } else if (isH1B) {
      options.push({
        value: "H1B_TRANSITION",
        label: "Change or extend my H-1B employment",
      });
    }

    options.push({
      value: "EB2_NIW",
      label: "Explore employment-based permanent residence",
    });

    return options;
  }, [
    canPlanStemExtension,
    isF1,
    isH1B,
    inGracePeriod,
    outsideUS,
  ]);

  function togglePendingCase(type: string, checked: boolean) {
    setPendingCases((current) =>
      checked
        ? [...new Set([...current, type])]
        : current.filter((item) => item !== type),
    );
  }

  async function onSubmit(formData: FormData) {
    setSaving(true);
    const location = physicalLocationSchema.parse(physicalLocation);
    const status =
      hasUnderlyingStatus && currentStatus
        ? known(currentStatusSchema.parse(currentStatus), "user")
        : unknown("No current nonimmigrant classification was provided");
    const priorStatus =
      inGracePeriod && formData.get("priorStatus")
        ? known(
            currentStatusSchema.parse(String(formData.get("priorStatus"))),
            "user",
          )
        : unknown("Not in a worker grace period");
    const targetClassification =
      outsideUS && formData.get("targetClassification")
        ? known(
            currentStatusSchema.parse(
              String(formData.get("targetClassification")),
            ),
            "user",
          )
        : unknown("No outside-U.S. target classification");
    const stage =
      isF1 && f1Stage
        ? known(f1StageSchema.parse(f1Stage), "user")
        : known("NOT_APPLICABLE" as const, "user");
    const cases = pendingCases.map((type) => ({
      type: type as "I485" | "I140" | "I130" | "ASYLUM" | "TPS" | "PAROLE",
      status: String(formData.get(`${type}Status`) ?? "PENDING") as
        | "PENDING"
        | "APPROVED",
    }));
    const aosDetails = hasI485
      ? {
          basis: known(
            String(formData.get("aosBasis") ?? "UNKNOWN") as
              | "EMPLOYMENT"
              | "FAMILY"
              | "DIVERSITY"
              | "OTHER"
              | "UNKNOWN",
            "user",
          ),
          receiptDate: dateValue(
            formData,
            "aosReceiptDate",
            "I-485 receipt date is unknown",
          ),
          priorityDate: dateValue(
            formData,
            "priorityDate",
            "Priority date is unknown",
          ),
          stage: known(
            String(formData.get("aosStage") ?? "RECEIPT") as
              | "RECEIPT"
              | "BIOMETRICS"
              | "RFE"
              | "INTERVIEW"
              | "PENDING_DECISION",
            "user",
          ),
          eadState: known(
            String(formData.get("eadState") ?? "UNKNOWN") as
              | "NOT_FILED"
              | "PENDING"
              | "APPROVED"
              | "EXPIRED"
              | "UNKNOWN",
            "user",
          ),
          advanceParoleState: known(
            String(formData.get("advanceParoleState") ?? "UNKNOWN") as
              | "NOT_FILED"
              | "PENDING"
              | "APPROVED"
              | "EXPIRED"
              | "UNKNOWN",
            "user",
          ),
        }
      : null;
    const goal = String(
      formData.get("immediateGoal") ?? "STILL_EXPLORING",
    ) as
      | "STILL_EXPLORING"
      | "MAINTAIN_STATUS"
      | "STEM_EXTENSION"
      | "H1B_TRANSITION"
      | "EB2_NIW";
    const citizenshipCountries = String(
      formData.get("citizenshipCountries") ?? "",
    )
      .split(",")
      .map((country) => country.trim())
      .filter(Boolean)
      .slice(0, 4);
    const maritalStatus = String(formData.get("maritalStatus") ?? "");
    const dependentCount = String(formData.get("dependentCount") ?? "");
    const baseProfile = editing ? activeProfile : personaA;
    const historyReview = {
      ...(editing
        ? activeProfile.historyReview
        : {
            identity: "not_started" as const,
            currentSituation: "not_started" as const,
            statusHistory: "not_started" as const,
            travelHistory: "not_started" as const,
            petitionsAndNotices: "not_started" as const,
            family: "not_started" as const,
          }),
      identity: "reviewed" as const,
      currentSituation: "reviewed" as const,
      family: "reviewed" as const,
    };

    const nextProfile: ImmigrationProfile = {
      ...baseProfile,
      userId: editing ? activeProfile.userId : createLocalUserId(),
      displayName: String(formData.get("displayName") || "Continuum user"),
      profileVersion: editing ? activeProfile.profileVersion + 1 : 1,
      updatedAt: new Date().toISOString(),
      citizenshipCountries: citizenshipCountries.length
        ? known(citizenshipCountries, "user")
        : unknown("Reviewed; user chose to add citizenship later"),
      dateOfBirth: dateValue(
        formData,
        "dateOfBirth",
        "Reviewed; user chose to add date of birth later",
      ),
      countryOfBirth: editing
        ? activeProfile.countryOfBirth
        : unknown("Not part of the initial assessment"),
      cityOfBirth: editing
        ? activeProfile.cityOfBirth
        : unknown("Not part of the initial assessment"),
      maritalStatus: maritalStatus
        ? known(
            maritalStatus as
              | "SINGLE"
              | "MARRIED"
              | "SEPARATED"
              | "DIVORCED"
              | "WIDOWED"
              | "OTHER",
            "user",
          )
        : unknown("Reviewed; user chose to add marital status later"),
      dependentCount: dependentCount
        ? known(Number(dependentCount), "user")
        : unknown("Reviewed; user chose to add dependents later"),
      physicalLocation: known(location, "user"),
      currentBasis:
        inUS && currentBasis
          ? known(currentBasisSchema.parse(currentBasis), "user")
          : unknown("Current U.S. basis does not apply outside the United States"),
      currentStatus: status,
      priorStatus,
      targetClassification,
      employmentEndDate: inGracePeriod
        ? dateValue(
            formData,
            "employmentEndDate",
            "Employment end date is unknown",
          )
        : unknown("Not in a worker grace period"),
      pendingCases: cases,
      aosDetails,
      f1Stage: stage,
      validUntil:
        hasUnderlyingStatus || inGracePeriod
          ? dateValue(
              formData,
              "validUntil",
              "Current validity date is unknown",
            )
          : unknown("No current nonimmigrant validity date"),
      immediateGoal: known(goal, "user"),
      employerType: isH1B
        ? known(
            String(formData.get("employerType")) as
              | "CAP_SUBJECT"
              | "CAP_EXEMPT",
            "user",
          )
        : known("NOT_APPLICABLE", "user"),
      employerEVerify: needsEVerify
        ? formData.get("employerEVerify") === "unknown"
          ? unknown("Employer enrollment has not been confirmed")
          : known(formData.get("employerEVerify") === "yes", "user")
        : unknown("Not required for the selected pathway"),
      plannedTravel: known(formData.get("plannedTravel") === "yes", "user"),
      nextKnownDeadline: dateValue(
        formData,
        "nextKnownDeadline",
        "No next deadline was provided",
      ),
      historyCompleteness: "incomplete",
      historyReview,
      evidenceCriteria: [
        {
          id: "basis",
          label: "Current immigration basis reviewed",
          state: currentBasis || outsideUS ? "met" : "needs_review",
        },
        {
          id: "deadline",
          label: "Next deadline confirmed",
          state: formData.get("nextKnownDeadline")
            ? "met"
            : "needs_review",
        },
        {
          id: "pending",
          label: "Pending cases reviewed",
          state: "met",
        },
      ],
      historyEvents: editing ? activeProfile.historyEvents : [],
    };
    const completion = getHistoryCompletion(nextProfile);
    const profile = {
      ...nextProfile,
      historyCompleteness: completion.status,
    } satisfies ImmigrationProfile;

    await saveProfile(profile);
    router.push("/runway");
  }

  return (
    <div className="min-h-screen px-6 py-8 md:px-12">
      <div className="mx-auto max-w-3xl">
        <div className="mb-10 flex items-center justify-between gap-4">
          <Link
            href="/"
            className="flex items-center gap-3 text-lg font-semibold text-[#18332d]"
          >
            <span className="grid size-10 place-items-center rounded-xl bg-[#143b33] text-white">
              <Leaf className="size-5" />
            </span>
            Continuum
          </Link>
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm font-semibold text-muted hover:text-brand"
          >
            <ArrowLeft className="size-4" /> Back
          </Link>
        </div>

        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand">
              Fast Start · About 3 minutes
            </p>
            <h1 className="mt-3 text-4xl font-semibold tracking-tight">
              Let’s map your runway.
            </h1>
            <p className="mt-3 max-w-2xl text-muted">
              Start with where you are today. We’ll only ask follow-up
              questions that apply to your situation.
            </p>
          </div>
          <div className="hidden size-14 place-items-center rounded-2xl bg-brand-soft text-brand sm:grid">
            <Sparkles className="size-6" />
          </div>
        </div>

        <form
          key={editing ? activeProfile.updatedAt : "new-profile"}
          className="mt-8 space-y-7 rounded-3xl border bg-white p-6 shadow-sm md:p-8"
          onSubmit={(event) => {
            event.preventDefault();
            void onSubmit(new FormData(event.currentTarget));
          }}
        >
          <label className="block">
            <span className="text-sm font-semibold">What should we call you?</span>
            <input
              required
              name="displayName"
              placeholder="First name"
              className={inputClass}
              defaultValue={editing ? activeProfile.displayName : ""}
            />
          </label>

          <fieldset className="rounded-2xl border bg-slate-50 p-5">
            <legend className="px-2 text-sm font-semibold">
              A few identity and family facts
            </legend>
            <p className="mb-4 text-xs leading-5 text-muted">
              Citizenship can affect nationality-specific pathways such as TN
              or H-1B1. Date of birth and family details are optional and can be
              added later.
            </p>
            <div className="grid gap-5 sm:grid-cols-2">
              <label className="sm:col-span-2">
                <span className="text-sm font-semibold">
                  Country or countries of citizenship
                </span>
                <input
                  name="citizenshipCountries"
                  placeholder="For example: Canada, Mexico"
                  className={inputClass}
                  defaultValue={
                    editing
                      ? fieldValue(activeProfile.citizenshipCountries)?.join(
                          ", ",
                        )
                      : ""
                  }
                />
                <span className="mt-1.5 block text-xs text-muted">
                  Separate multiple citizenships with commas.
                </span>
              </label>
              <label>
                <span className="text-sm font-semibold">
                  Date of birth (optional)
                </span>
                <input
                  type="date"
                  name="dateOfBirth"
                  className={inputClass}
                  defaultValue={
                    editing ? fieldValue(activeProfile.dateOfBirth) : ""
                  }
                />
              </label>
              <label>
                <span className="text-sm font-semibold">Marital status</span>
                <select
                  name="maritalStatus"
                  className={inputClass}
                  defaultValue={
                    editing
                      ? (fieldValue(activeProfile.maritalStatus) ?? "")
                      : ""
                  }
                >
                  <option value="">Prefer to add later</option>
                  <option value="SINGLE">Single</option>
                  <option value="MARRIED">Married</option>
                  <option value="SEPARATED">Separated</option>
                  <option value="DIVORCED">Divorced</option>
                  <option value="WIDOWED">Widowed</option>
                  <option value="OTHER">Other</option>
                </select>
              </label>
              <label>
                <span className="text-sm font-semibold">
                  Number of dependents
                </span>
                <input
                  type="number"
                  min="0"
                  max="20"
                  name="dependentCount"
                  placeholder="Add later"
                  className={inputClass}
                  defaultValue={
                    editing ? fieldValue(activeProfile.dependentCount) : ""
                  }
                />
              </label>
            </div>
          </fieldset>

          <fieldset>
            <legend className="text-sm font-semibold">
              Are you currently inside the United States?
            </legend>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {[
                ["IN_US", "Yes, I’m in the U.S."],
                ["OUTSIDE_US", "No, I’m outside the U.S."],
              ].map(([value, label]) => (
                <label
                  key={value}
                  className={`cursor-pointer rounded-xl border p-4 text-sm font-medium ${
                    physicalLocation === value
                      ? "border-brand bg-brand-soft text-brand"
                      : "bg-white"
                  }`}
                >
                  <input
                    required
                    type="radio"
                    name="physicalLocation"
                    value={value}
                    checked={physicalLocation === value}
                    onChange={() =>
                      setPhysicalLocation(value as "IN_US" | "OUTSIDE_US")
                    }
                    className="mr-2"
                  />
                  {label}
                </label>
              ))}
            </div>
          </fieldset>

          {inUS && (
            <label className="block">
              <span className="text-sm font-semibold">
                What best describes your current basis for being in the U.S.?
              </span>
              <select
                required
                name="currentBasis"
                className={inputClass}
                value={currentBasis}
                onChange={(event) => {
                  const value = event.target.value;
                  setCurrentBasis(value);
                  if (value === "PENDING_ADJUSTMENT_ONLY") {
                    togglePendingCase("I485", true);
                  }
                }}
              >
                <option value="" disabled>
                  Select your current basis
                </option>
                <option value="NONIMMIGRANT_STATUS">
                  I’m maintaining a nonimmigrant status
                </option>
                <option value="PENDING_ADJUSTMENT_ONLY">
                  I have a pending I-485 and no current underlying status
                </option>
                <option value="WORKER_GRACE_PERIOD">
                  I’m in a worker grace period after employment ended
                </option>
                <option value="TPS">Temporary Protected Status</option>
                <option value="PAROLE">Parole</option>
                <option value="ASYLUM_RELATED">
                  Asylum pending, asylee, or refugee
                </option>
                <option value="PERMANENT_RESIDENT">
                  Lawful permanent resident
                </option>
                <option value="OTHER">Other / not sure</option>
              </select>
              <span className="mt-2 block text-xs leading-5 text-muted">
                A visa stamp and your current U.S. status are not always the
                same thing.
              </span>
            </label>
          )}

          {hasUnderlyingStatus && (
            <label className="block">
              <span className="text-sm font-semibold">
                Current status or classification
              </span>
              <select
                required
                name="currentStatus"
                className={inputClass}
                value={currentStatus}
                onChange={(event) => setCurrentStatus(event.target.value)}
              >
                <option value="" disabled>
                  Select your current status
                </option>
                {supportedStatuses.map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
          )}

          {isF1 && (
            <label className="block">
              <span className="text-sm font-semibold">
                What is your current F-1 program or training stage?
              </span>
              <select
                name="f1Stage"
                className={inputClass}
                value={f1Stage}
                onChange={(event) => setF1Stage(event.target.value)}
              >
                <option value="ENROLLED">Enrolled in a program</option>
                <option value="CPT">CPT</option>
                <option value="POST_COMPLETION_OPT">Post-completion OPT</option>
                <option value="STEM_OPT">24-month STEM OPT extension</option>
              </select>
            </label>
          )}

          {inGracePeriod && (
            <div className="grid gap-5 sm:grid-cols-2">
              <label>
                <span className="text-sm font-semibold">
                  Classification before employment ended
                </span>
                <select
                  required
                  name="priorStatus"
                  className={inputClass}
                  defaultValue={
                    editing ? (fieldValue(activeProfile.priorStatus) ?? "") : ""
                  }
                >
                  <option value="">Select prior classification</option>
                  {workerGraceStatuses.map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span className="text-sm font-semibold">
                  Last day of employment
                </span>
                <input
                  required
                  type="date"
                  name="employmentEndDate"
                  className={inputClass}
                  defaultValue={
                    editing
                      ? fieldValue(activeProfile.employmentEndDate)
                      : ""
                  }
                />
              </label>
            </div>
          )}

          {outsideUS && (
            <label className="block">
              <span className="text-sm font-semibold">
                Which U.S. pathway are you exploring?
              </span>
              <select
                required
                name="targetClassification"
                className={inputClass}
                defaultValue={
                  editing
                    ? (fieldValue(activeProfile.targetClassification) ?? "")
                    : ""
                }
              >
                <option value="">Select a target classification</option>
                {supportedStatuses.map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
          )}

          {(hasUnderlyingStatus || inGracePeriod) && (
            <label className="block">
              <span className="text-sm font-semibold">
                Current authorized validity end date
              </span>
              <input
                type="date"
                name="validUntil"
                className={inputClass}
                defaultValue={
                  editing ? fieldValue(activeProfile.validUntil) : ""
                }
              />
            </label>
          )}

          {(inUS || outsideUS) && (
            <fieldset>
              <legend className="text-sm font-semibold">
                Do you have any pending or approved applications?
              </legend>
              <p className="mt-1 text-xs text-muted">
                Select all that apply. These may overlap with an underlying
                status.
              </p>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                {[
                  ["I485", "Form I-485 adjustment"],
                  ["I140", "Form I-140 immigrant petition"],
                  ["I130", "Form I-130 family petition"],
                  ["ASYLUM", "Asylum application"],
                  ["TPS", "TPS application"],
                  ["PAROLE", "Parole request"],
                ].map(([type, label]) => (
                  <label
                    key={type}
                    className="flex items-center gap-2 rounded-xl border p-3 text-sm"
                  >
                    <input
                      type="checkbox"
                      checked={pendingCases.includes(type)}
                      onChange={(event) =>
                        togglePendingCase(type, event.target.checked)
                      }
                    />
                    {label}
                  </label>
                ))}
              </div>
              {pendingCases
                .filter((type) => ["I485", "I140", "I130"].includes(type))
                .map((type) => (
                  <label key={`${type}-status`} className="mt-3 block">
                    <span className="text-xs font-semibold">
                      {type.replace("I", "I-")} status
                    </span>
                    <select
                      name={`${type}Status`}
                      className={inputClass}
                      defaultValue={
                        editing
                          ? (activeProfile.pendingCases.find(
                              (item) => item.type === type,
                            )?.status ?? "PENDING")
                          : "PENDING"
                      }
                    >
                      <option value="PENDING">Pending</option>
                      <option value="APPROVED">Approved</option>
                    </select>
                  </label>
                ))}
            </fieldset>
          )}

          {hasI485 && (
            <fieldset className="rounded-2xl border bg-slate-50 p-5">
              <legend className="px-2 text-sm font-semibold">
                Pending adjustment details
              </legend>
              <p className="mb-4 text-xs leading-5 text-muted">
                A pending I-485 is tracked separately because it does not, by
                itself, confer lawful nonimmigrant status.
              </p>
              <div className="grid gap-5 sm:grid-cols-2">
                <label>
                  <span className="text-sm font-semibold">Adjustment basis</span>
                  <select
                    name="aosBasis"
                    className={inputClass}
                    defaultValue={
                      editing && activeProfile.aosDetails
                        ? (fieldValue(activeProfile.aosDetails.basis) ??
                          "UNKNOWN")
                        : "EMPLOYMENT"
                    }
                  >
                    <option value="EMPLOYMENT">Employment-based</option>
                    <option value="FAMILY">Family-based</option>
                    <option value="DIVERSITY">Diversity visa</option>
                    <option value="OTHER">Other</option>
                    <option value="UNKNOWN">I don’t know</option>
                  </select>
                </label>
                <label>
                  <span className="text-sm font-semibold">Case stage</span>
                  <select
                    name="aosStage"
                    className={inputClass}
                    defaultValue={
                      editing && activeProfile.aosDetails
                        ? (fieldValue(activeProfile.aosDetails.stage) ??
                          "RECEIPT")
                        : "RECEIPT"
                    }
                  >
                    <option value="RECEIPT">Receipt received</option>
                    <option value="BIOMETRICS">Biometrics</option>
                    <option value="RFE">RFE</option>
                    <option value="INTERVIEW">Interview</option>
                    <option value="PENDING_DECISION">Pending decision</option>
                  </select>
                </label>
                <label>
                  <span className="text-sm font-semibold">I-485 receipt date</span>
                  <input
                    type="date"
                    name="aosReceiptDate"
                    className={inputClass}
                    defaultValue={
                      editing && activeProfile.aosDetails
                        ? fieldValue(activeProfile.aosDetails.receiptDate)
                        : ""
                    }
                  />
                </label>
                <label>
                  <span className="text-sm font-semibold">Priority date</span>
                  <input
                    type="date"
                    name="priorityDate"
                    className={inputClass}
                    defaultValue={
                      editing && activeProfile.aosDetails
                        ? fieldValue(activeProfile.aosDetails.priorityDate)
                        : ""
                    }
                  />
                </label>
                <label>
                  <span className="text-sm font-semibold">
                    Adjustment EAD
                  </span>
                  <select
                    name="eadState"
                    className={inputClass}
                    defaultValue={
                      editing && activeProfile.aosDetails
                        ? (fieldValue(activeProfile.aosDetails.eadState) ??
                          "UNKNOWN")
                        : "UNKNOWN"
                    }
                  >
                    <option value="UNKNOWN">I don’t know</option>
                    <option value="NOT_FILED">Not filed</option>
                    <option value="PENDING">Pending</option>
                    <option value="APPROVED">Approved</option>
                    <option value="EXPIRED">Expired</option>
                  </select>
                </label>
                <label>
                  <span className="text-sm font-semibold">
                    Advance parole
                  </span>
                  <select
                    name="advanceParoleState"
                    className={inputClass}
                    defaultValue={
                      editing && activeProfile.aosDetails
                        ? (fieldValue(
                            activeProfile.aosDetails.advanceParoleState,
                          ) ?? "UNKNOWN")
                        : "UNKNOWN"
                    }
                  >
                    <option value="UNKNOWN">I don’t know</option>
                    <option value="NOT_FILED">Not filed</option>
                    <option value="PENDING">Pending</option>
                    <option value="APPROVED">Approved</option>
                    <option value="EXPIRED">Expired</option>
                  </select>
                </label>
              </div>
            </fieldset>
          )}

          {isH1B && (
            <label className="block">
              <span className="text-sm font-semibold">
                H-1B employer context
              </span>
              <select
                name="employerType"
                className={inputClass}
                defaultValue={
                  editing
                    ? (fieldValue(activeProfile.employerType) ?? "CAP_SUBJECT")
                    : "CAP_SUBJECT"
                }
              >
                <option value="CAP_SUBJECT">Cap-subject</option>
                <option value="CAP_EXEMPT">Cap-exempt</option>
              </select>
            </label>
          )}

          {needsEVerify && (
            <label className="block">
              <span className="text-sm font-semibold">
                Employer participates in E-Verify?
              </span>
              <select
                name="employerEVerify"
                className={inputClass}
                defaultValue={
                  editing
                    ? activeProfile.employerEVerify.state === "known"
                      ? activeProfile.employerEVerify.value
                        ? "yes"
                        : "no"
                      : "unknown"
                    : "unknown"
                }
              >
                <option value="yes">Yes</option>
                <option value="no">No</option>
                <option value="unknown">I don’t know yet</option>
              </select>
            </label>
          )}

          {(inUS || outsideUS) && (
            <div className="grid gap-5 sm:grid-cols-2">
              <label>
                <span className="text-sm font-semibold">
                  What are you focused on right now?
                </span>
                <select
                  name="immediateGoal"
                  className={inputClass}
                  defaultValue={
                    editing
                      ? (fieldValue(activeProfile.immediateGoal) ??
                        "STILL_EXPLORING")
                      : "STILL_EXPLORING"
                  }
                  key={`${currentStatus}-${f1Stage}-${physicalLocation}`}
                >
                  {goalOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <span className="mt-1.5 block text-xs text-muted">
                  Not sure is fine. Continuum can still track what you know
                  today.
                </span>
              </label>
              <label>
                <span className="text-sm font-semibold">
                  Next known deadline
                </span>
                <input
                  type="date"
                  name="nextKnownDeadline"
                  className={inputClass}
                  defaultValue={
                    editing
                      ? fieldValue(activeProfile.nextKnownDeadline)
                      : ""
                  }
                />
              </label>
              <label className="sm:col-span-2">
                <span className="text-sm font-semibold">
                  Any planned international travel?
                </span>
                <select
                  name="plannedTravel"
                  className={inputClass}
                  defaultValue={
                    editing && fieldValue(activeProfile.plannedTravel)
                      ? "yes"
                      : "no"
                  }
                >
                  <option value="yes">Yes</option>
                  <option value="no">No</option>
                </select>
              </label>
            </div>
          )}

          <div className="flex items-start gap-3 rounded-2xl bg-brand-soft p-4 text-sm text-brand">
            <CircleHelp className="mt-0.5 size-4 shrink-0" />
            <p>
              We know immigration details are sensitive. Your answers are used
              to personalize your runway, deadlines, and alerts.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4">
            <span className="inline-flex items-center gap-2 text-xs text-muted">
              <Check className="size-4 text-brand" /> You can update your
              answers at any time
            </span>
            <button
              disabled={saving || !physicalLocation}
              className="inline-flex items-center gap-2 rounded-xl bg-brand px-5 py-3 text-sm font-semibold text-white hover:bg-[#0e5c4e] disabled:opacity-60"
            >
              {saving ? "Saving…" : "Create my runway"}{" "}
              <ArrowRight className="size-4" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
