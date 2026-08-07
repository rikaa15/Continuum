"use client";

import Link from "next/link";
import {
  ArrowRight,
  Bell,
  CalendarClock,
  CircleHelp,
  Filter,
  ShieldCheck,
  TrendingUp,
} from "lucide-react";
import { useProfile } from "@/components/profile-provider";
import {
  classifyMonitoringResult,
  type PersonalizedAlertKind,
} from "@/lib/rules/classify";
import { evaluateRule } from "@/lib/rules/evaluate";
import { monitoringRules } from "@/lib/rules/fixtures/monitoring";

const kindPresentation = {
  deadline: {
    label: "Deadline",
    description: "A date or action window may attach to your profile.",
    icon: CalendarClock,
    style: "bg-rose-50 text-rose-800",
  },
  reprioritization: {
    label: "Re-prioritize",
    description: "Your long-arc plan may need a different order.",
    icon: TrendingUp,
    style: "bg-violet-50 text-violet-800",
  },
  needs_review: {
    label: "Needs facts",
    description: "Continuum needs a confirmed fact before classifying this.",
    icon: CircleHelp,
    style: "bg-amber-50 text-amber-800",
  },
  noise: {
    label: "No action",
    description: "Real monitoring item, not relevant to your current profile.",
    icon: ShieldCheck,
    style: "bg-emerald-50 text-emerald-800",
  },
} as const;

export default function AlertsPage() {
  const { ready, profile } = useProfile();
  if (!ready) {
    return (
      <div className="px-6 py-9 text-sm text-muted">
        Evaluating monitoring items…
      </div>
    );
  }

  const evaluations = monitoringRules
    .map((rule) => {
      const result = evaluateRule(rule, profile);
      return { rule, result, kind: classifyMonitoringResult(rule, result) };
    })
    .sort((left, right) => {
      const priority: Record<PersonalizedAlertKind, number> = {
        deadline: 0,
        reprioritization: 1,
        needs_review: 2,
        noise: 3,
      };
      return priority[left.kind] - priority[right.kind];
    });
  const actionCount = evaluations.filter(
    (item) => item.kind === "deadline" || item.kind === "reprioritization",
  ).length;
  const noiseCount = evaluations.filter((item) => item.kind === "noise").length;

  return (
    <div className="px-6 py-9 md:px-12">
      <div className="mx-auto max-w-6xl">
        <header className="flex flex-wrap items-start justify-between gap-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand">
              Change layer
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight">
              What changed—and what should you do?
            </h1>
            <p className="mt-3 max-w-3xl leading-7 text-muted">
              Continuum joins each monitoring event with confirmed profile facts
              and classifies it as a deadline, a re-prioritization, or noise.
              Doing nothing is a first-class result.
            </p>
          </div>
          <span className="inline-flex items-center gap-2 rounded-full border bg-white px-3 py-2 text-xs font-semibold">
            <Filter className="size-3.5 text-brand" />
            {actionCount} action · {noiseCount} no action
          </span>
        </header>

        <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
          <p className="font-semibold">Demonstration monitoring fixtures</p>
          <p className="mt-1 text-xs leading-5 text-amber-900/75">
            These scenarios demonstrate personalization and are not assertions
            of current law. Each detail page shows stage, provenance, counsel
            review status, and the authoritative source to verify.
          </p>
        </div>

        <section className="mt-7 grid gap-4">
          {evaluations.map(({ rule, result, kind }) => {
            const presentation = kindPresentation[kind];
            const KindIcon = presentation.icon;
            return (
              <Link
                key={rule.ruleId}
                href={`/alerts/${rule.ruleId}`}
                className="group rounded-3xl border bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-brand/30"
              >
                <div className="flex flex-wrap items-start justify-between gap-5">
                  <div className="flex max-w-3xl gap-4">
                    <span
                      className={`grid size-11 shrink-0 place-items-center rounded-2xl ${presentation.style}`}
                    >
                      <KindIcon className="size-5" />
                    </span>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${presentation.style}`}
                        >
                          {presentation.label}
                        </span>
                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold capitalize text-slate-700">
                          {rule.channel}
                        </span>
                        {rule.isDemonstrationFixture && (
                          <span className="text-[11px] font-semibold text-amber-700">
                            demo
                          </span>
                        )}
                      </div>
                      <h2 className="mt-3 text-lg font-semibold">
                        {rule.title}
                      </h2>
                      <p className="mt-2 text-sm leading-6 text-muted">
                        {presentation.description}
                      </p>
                      <p className="mt-3 text-sm font-medium">
                        {result.recommendedAction}
                      </p>
                    </div>
                  </div>
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-brand">
                    See why <ArrowRight className="size-3.5" />
                  </span>
                </div>
              </Link>
            );
          })}
        </section>

        <section className="mt-7 rounded-3xl bg-[#183e35] p-7 text-white">
          <Bell className="size-5 text-emerald-200" />
          <h2 className="mt-4 text-xl font-semibold">
            Less news, more correct filtering
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-emerald-100/70">
            The production path is source ingestion → versioned review →
            deterministic profile join → deadline, re-prioritize, needs facts,
            or no action. An LLM may explain the result, but it does not decide
            who is affected.
          </p>
        </section>
      </div>
    </div>
  );
}
