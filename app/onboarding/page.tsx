import { ArrowRight, Check, CircleHelp, Sparkles } from "lucide-react";
import { saveFastStart } from "@/app/actions";

const inputClass =
  "mt-2 w-full rounded-xl border bg-white px-3.5 py-3 text-sm shadow-sm outline-none hover:border-brand/30";

export default function OnboardingPage() {
  return (
    <div className="px-6 py-10 md:px-12">
      <div className="mx-auto max-w-3xl">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand">
              Fast Start · About 2 minutes
            </p>
            <h1 className="mt-3 text-4xl font-semibold tracking-tight">
              Let’s map your runway.
            </h1>
            <p className="mt-3 max-w-2xl text-muted">
              Start with what is true today. You can build the rest of your
              history later, and “I don’t know” is always a safe answer.
            </p>
          </div>
          <div className="hidden size-14 place-items-center rounded-2xl bg-brand-soft text-brand sm:grid">
            <Sparkles className="size-6" />
          </div>
        </div>

        <div className="mt-8 flex gap-2">
          <span className="h-1.5 flex-[2] rounded-full bg-brand" />
          <span className="h-1.5 flex-1 rounded-full bg-line" />
          <span className="h-1.5 flex-1 rounded-full bg-line" />
        </div>

        <form action={saveFastStart} className="mt-8 rounded-3xl border bg-white p-6 shadow-sm md:p-8">
          <div className="grid gap-6 sm:grid-cols-2">
            <label className="sm:col-span-2">
              <span className="text-sm font-semibold">What should we call you?</span>
              <input required name="displayName" placeholder="First name" className={inputClass} />
            </label>
            <label>
              <span className="text-sm font-semibold">Current U.S. status or classification</span>
              <select name="currentStatus" className={inputClass} defaultValue="F1">
                <optgroup label="Students and exchange visitors">
                  <option value="F1">F-1 · Academic student</option>
                  <option value="J1">J-1 · Exchange visitor</option>
                  <option value="M1">M-1 · Vocational student</option>
                </optgroup>
                <optgroup label="Temporary workers and dependents">
                  <option value="H1B">H-1B · Specialty occupation</option>
                  <option value="H1B1">H-1B1 · Chile or Singapore</option>
                  <option value="H2A">H-2A · Agricultural worker</option>
                  <option value="H2B">H-2B · Non-agricultural worker</option>
                  <option value="H3">H-3 · Trainee</option>
                  <option value="H4">H-4 · H dependent</option>
                  <option value="O1">O-1 · Extraordinary ability</option>
                  <option value="O2">O-2 · O-1 support</option>
                  <option value="O3">O-3 · O dependent</option>
                  <option value="L1">L-1 · Intracompany transferee</option>
                  <option value="L2">L-2 · L dependent</option>
                  <option value="TN">TN · Canadian or Mexican professional</option>
                  <option value="TD">TD · TN dependent</option>
                  <option value="E1">E-1 · Treaty trader</option>
                  <option value="E2">E-2 · Treaty investor</option>
                  <option value="E3">E-3 · Australian professional</option>
                  <option value="P1">P-1 · Athlete or entertainer</option>
                  <option value="P2">P-2 · Reciprocal exchange</option>
                  <option value="P3">P-3 · Culturally unique program</option>
                  <option value="P4">P-4 · P dependent</option>
                  <option value="Q1">Q-1 · Cultural exchange</option>
                  <option value="R1">R-1 · Religious worker</option>
                </optgroup>
                <optgroup label="Visitors and other classifications">
                  <option value="B1">B-1 · Business visitor</option>
                  <option value="B2">B-2 · Visitor for pleasure</option>
                  <option value="A">A · Diplomatic or government</option>
                  <option value="G">G · International organization</option>
                  <option value="I">I · Foreign media</option>
                  <option value="C1">C-1 · Transit</option>
                  <option value="D">D · Crew member</option>
                  <option value="K1">K-1 · Fiancé(e)</option>
                  <option value="K3">K-3 · Spouse of U.S. citizen</option>
                </optgroup>
                <optgroup label="Other current statuses">
                  <option value="TPS">Temporary Protected Status</option>
                  <option value="PAROLE">Parole</option>
                  <option value="ASYLUM">Asylee or asylum applicant</option>
                  <option value="REFUGEE">Refugee</option>
                  <option value="PERMANENT_RESIDENT">Lawful permanent resident</option>
                  <option value="OTHER">Other / not sure</option>
                </optgroup>
              </select>
              <span className="mt-2 block text-xs leading-5 text-muted">
                Use your current status, not only the visa stamp in your passport.
              </span>
            </label>
            <label>
              <span className="text-sm font-semibold">If F-1, what is your current stage?</span>
              <select name="f1Stage" className={inputClass} defaultValue="STEM_OPT">
                <option value="ENROLLED">Enrolled in a program</option>
                <option value="CPT">Curricular Practical Training (CPT)</option>
                <option value="POST_COMPLETION_OPT">Post-completion OPT</option>
                <option value="STEM_OPT">24-month STEM OPT extension</option>
              </select>
              <span className="mt-2 block text-xs leading-5 text-muted">
                OPT and STEM OPT are benefits connected to F-1 status.
              </span>
            </label>
            <label>
              <span className="text-sm font-semibold">Current validity end date</span>
              <input required type="date" name="validUntil" defaultValue="2027-02-14" className={inputClass} />
            </label>
            <label>
              <span className="text-sm font-semibold">Immediate goal</span>
              <select name="immediateGoal" className={inputClass} defaultValue="MAINTAIN_STATUS">
                <option value="MAINTAIN_STATUS">Maintain my current status</option>
                <option value="STEM_EXTENSION">Plan a STEM extension</option>
                <option value="H1B_TRANSITION">Explore an H-1B transition</option>
                <option value="EB2_NIW">Explore EB-2 NIW</option>
              </select>
            </label>
            <label>
              <span className="text-sm font-semibold">Next known deadline</span>
              <input required type="date" name="nextKnownDeadline" defaultValue="2026-09-18" className={inputClass} />
            </label>
            <label>
              <span className="text-sm font-semibold">Employer participates in E-Verify?</span>
              <select name="employerEVerify" className={inputClass} defaultValue="yes">
                <option value="yes">Yes</option>
                <option value="no">No</option>
                <option value="unknown">I don’t know yet</option>
              </select>
            </label>
            <label>
              <span className="text-sm font-semibold">Any planned international travel?</span>
              <select name="plannedTravel" className={inputClass} defaultValue="yes">
                <option value="yes">Yes</option>
                <option value="no">No</option>
              </select>
            </label>
            <label>
              <span className="text-sm font-semibold">H-1B employer context</span>
              <select name="employerType" className={inputClass} defaultValue="CAP_SUBJECT">
                <option value="CAP_SUBJECT">Cap-subject</option>
                <option value="CAP_EXEMPT">Cap-exempt</option>
              </select>
            </label>
          </div>

          <div className="mt-7 flex items-start gap-3 rounded-2xl bg-brand-soft p-4 text-sm text-brand">
            <CircleHelp className="mt-0.5 size-4 shrink-0" />
            <p>
              We do not request Social Security numbers, passport numbers, or
              document uploads. Demo profiles are synthetic.
            </p>
          </div>
          <div className="mt-7 flex flex-wrap items-center justify-between gap-4">
            <span className="inline-flex items-center gap-2 text-xs text-muted">
              <Check className="size-4 text-brand" /> Saves automatically to your memory profile
            </span>
            <button className="inline-flex items-center gap-2 rounded-xl bg-brand px-5 py-3 text-sm font-semibold text-white hover:bg-[#0e5c4e]">
              Create my runway <ArrowRight className="size-4" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
