"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Bot,
  Check,
  CircleHelp,
  ExternalLink,
  FileText,
  Paperclip,
  Send,
  ShieldCheck,
  Sparkles,
  Trash2,
  UserRound,
} from "lucide-react";
import { useProfile } from "@/components/profile-provider";
import type { ImmigrationProfile } from "@/lib/domain/profile";
import {
  documentAnalysisResultSchema,
  isAcceptedDocumentType,
  MAX_DOCUMENT_BYTES,
} from "@/lib/history/document-analysis";
import {
  historyInterviewResponseSchema,
  validateFactValue,
  type HistoryInterviewResponse,
} from "@/lib/history/interview";
import {
  getHistoryCompletion,
  historyAreas,
  type HistoryAreaId,
} from "@/lib/profile/completeness";
import { confirmHistoryUpdates } from "@/lib/profile/history-updates";
import {
  deleteDocumentFile,
  getDocumentFile,
  saveDocumentFile,
} from "@/lib/profile/document-store";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

type HistoryDraft = {
  message: string;
  messages: ChatMessage[];
  result: HistoryInterviewResponse | null;
  selected: string[];
  pendingMessage: string | null;
};

const HISTORY_DRAFT_EVENT = "continuum-history-draft-change";

function draftStorageKey(
  userId: string,
  area: HistoryAreaId,
  eventId: string | null,
) {
  return `continuum.historyDraft.${userId}.${area}.${eventId ?? "new"}`;
}

function readDraft(key: string): HistoryDraft | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as HistoryDraft;
    return {
      message: typeof parsed.message === "string" ? parsed.message : "",
      messages: Array.isArray(parsed.messages) ? parsed.messages : [],
      result: parsed.result
        ? historyInterviewResponseSchema.parse(parsed.result)
        : null,
      selected: Array.isArray(parsed.selected) ? parsed.selected : [],
      pendingMessage:
        typeof parsed.pendingMessage === "string"
          ? parsed.pendingMessage
          : null,
    };
  } catch {
    return null;
  }
}

function writeDraft(key: string, draft: HistoryDraft, notify = false) {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(key, JSON.stringify(draft));
  if (notify) {
    window.dispatchEvent(
      new CustomEvent(HISTORY_DRAFT_EVENT, { detail: { key } }),
    );
  }
}

function currentValue(
  field: { state: "known"; value: string } | { state: "unknown" },
) {
  return field.state === "known" ? field.value : null;
}

function reviewedFactsForArea(
  profile: ImmigrationProfile,
  area: HistoryAreaId,
) {
  const facts: Record<string, string | number | boolean | string[]> = {};
  const add = (
    label: string,
    field:
      | { state: "known"; value: string | number | boolean | string[] }
      | { state: "unknown" },
  ) => {
    if (field.state === "known") facts[label] = field.value;
  };

  add("citizenshipCountries", profile.citizenshipCountries);
  add("maritalStatus", profile.maritalStatus);
  add("dependentCount", profile.dependentCount);

  if (area === "identity") {
    add("dateOfBirth", profile.dateOfBirth);
    add("countryOfBirth", profile.countryOfBirth);
    add("cityOfBirth", profile.cityOfBirth);
  }
  if (area === "currentSituation" || area === "statusHistory") {
    add("physicalLocation", profile.physicalLocation);
    add("currentBasis", profile.currentBasis);
    add("currentStatus", profile.currentStatus);
    add("priorStatus", profile.priorStatus);
    add("f1Stage", profile.f1Stage);
    add("validUntil", profile.validUntil);
    add("employmentEndDate", profile.employmentEndDate);
  }
  if (area === "travelHistory") {
    add("physicalLocation", profile.physicalLocation);
    add("plannedTravel", profile.plannedTravel);
  }
  if (area === "petitionsAndNotices") {
    facts.pendingCases = profile.pendingCases.map(
      (item) => `${item.type}:${item.status}`,
    );
  }
  return facts;
}

function areaForEventType(
  type:
    | "status"
    | "entry_exit"
    | "education"
    | "employment"
    | "petition"
    | "notice"
    | "family"
    | "travel",
): HistoryAreaId {
  if (type === "entry_exit" || type === "travel") return "travelHistory";
  if (type === "petition" || type === "notice")
    return "petitionsAndNotices";
  if (type === "family") return "family";
  return "statusHistory";
}

export default function HistoryPage() {
  const router = useRouter();
  const { ready, profile, isDemoProfile, saveProfile } = useProfile();
  const completion = useMemo(() => getHistoryCompletion(profile), [profile]);
  const [area, setArea] = useState<HistoryAreaId>(
    completion.nextArea?.id ?? "statusHistory",
  );
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [result, setResult] = useState<HistoryInterviewResponse | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [sending, setSending] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [pendingMessage, setPendingMessage] = useState<string | null>(null);
  const [draftReadyKey, setDraftReadyKey] = useState<string | null>(null);
  const [uploadingDocument, setUploadingDocument] = useState(false);
  const activeDraftKeyRef = useRef<string | null>(null);
  const messageInputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const selectedArea =
    historyAreas.find((candidate) => candidate.id === area) ?? historyAreas[0];
  const areaIndex = historyAreas.findIndex((candidate) => candidate.id === area);
  const editingEvent = editingEventId
    ? profile.historyEvents.find((event) => event.id === editingEventId)
    : undefined;
  const draftKey = draftStorageKey(profile.userId, area, editingEventId);
  const areaDocuments = profile.documents.filter(
    (document) => document.category === area,
  );

  useEffect(() => {
    const eventId = new URLSearchParams(window.location.search).get("event");
    if (!eventId) return;
    const event = profile.historyEvents.find((item) => item.id === eventId);
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      setEditingEventId(eventId);
      if (event) setArea(areaForEventType(event.type));
    });
    return () => {
      cancelled = true;
    };
  }, [profile.historyEvents]);

  useEffect(() => {
    if (new URLSearchParams(window.location.search).has("event")) return;
    const savedArea = window.sessionStorage.getItem(
      `continuum.historyActiveArea.${profile.userId}`,
    );
    if (
      !savedArea ||
      !historyAreas.some((candidate) => candidate.id === savedArea)
    ) {
      return;
    }
    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) setArea(savedArea as HistoryAreaId);
    });
    return () => {
      cancelled = true;
    };
  }, [profile.userId]);

  useEffect(() => {
    activeDraftKeyRef.current = draftKey;
    const restore = () => {
      const draft = readDraft(draftKey);
      queueMicrotask(() => {
        if (activeDraftKeyRef.current !== draftKey) return;
        setMessage(draft?.message ?? "");
        setMessages(draft?.messages ?? []);
        setResult(draft?.result ?? null);
        setSelected(new Set(draft?.selected ?? []));
        setPendingMessage(draft?.pendingMessage ?? null);
        setSending(false);
        setDraftReadyKey(draftKey);
      });
    };
    const handleDraftChange = (event: Event) => {
      const changedKey = (event as CustomEvent<{ key?: string }>).detail?.key;
      if (changedKey === draftKey) restore();
    };
    restore();
    window.addEventListener(HISTORY_DRAFT_EVENT, handleDraftChange);
    return () => {
      window.removeEventListener(HISTORY_DRAFT_EVENT, handleDraftChange);
    };
  }, [draftKey]);

  useEffect(() => {
    if (draftReadyKey !== draftKey) return;
    window.sessionStorage.setItem(
      `continuum.historyActiveArea.${profile.userId}`,
      area,
    );
    writeDraft(draftKey, {
      message,
      messages,
      result,
      selected: [...selected],
      pendingMessage,
    });
  }, [
    draftKey,
    draftReadyKey,
    area,
    message,
    messages,
    pendingMessage,
    profile.userId,
    result,
    selected,
  ]);

  if (!ready) {
    return (
      <div className="px-6 py-9 text-sm text-muted">
        Loading your history…
      </div>
    );
  }

  if (isDemoProfile) {
    return (
      <div className="px-6 py-12 md:px-12">
        <div className="mx-auto max-w-2xl rounded-3xl border bg-white p-8 shadow-sm">
          <Sparkles className="size-7 text-brand" />
          <h1 className="mt-5 text-2xl font-semibold">
            History interviews are for your own profile
          </h1>
          <p className="mt-3 leading-7 text-muted">
            Maya and Daniel are read-only examples. Create your own runway to
            review a real history without changing the demos.
          </p>
          <Link
            href="/onboarding"
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white"
          >
            Create my profile <ArrowRight className="size-4" />
          </Link>
        </div>
      </div>
    );
  }

  async function uploadDocument(file: File) {
    if (!isAcceptedDocumentType(file.type)) {
      window.alert("Please choose a PDF, JPEG, or PNG document.");
      return;
    }
    if (file.size <= 0 || file.size > MAX_DOCUMENT_BYTES) {
      window.alert("Documents must be smaller than 10 MB.");
      return;
    }

    const documentId =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? `document-${crypto.randomUUID()}`
        : `document-${Date.now()}`;
    const uploadedAt = new Date().toISOString();
    const metadata = {
      id: documentId,
      name: file.name.slice(0, 180),
      mimeType: file.type,
      size: file.size,
      category: area,
      uploadedAt,
      analysisStatus: "uploaded" as const,
      summary: null,
    };
    const profileWithDocument = {
      ...profile,
      profileVersion: profile.profileVersion + 1,
      updatedAt: uploadedAt,
      documents: [
        ...profile.documents.filter((item) => item.id !== documentId),
        metadata,
      ].slice(-30),
    };
    setUploadingDocument(true);

    try {
      await saveDocumentFile(profile.userId, documentId, file);
      await saveProfile(profileWithDocument, { syncEverOS: false });

      const formData = new FormData();
      formData.set("file", file);
      formData.set("category", area);
      const status = currentValue(profile.currentStatus);
      if (status) formData.set("currentStatus", status);
      const response = await fetch("/api/history/documents/analyze", {
        method: "POST",
        body: formData,
      });
      const body = await response.json();
      if (!response.ok) {
        throw new Error(body.error ?? "Document analysis failed");
      }

      const analysis = documentAnalysisResultSchema.parse(body);
      const interviewResult = historyInterviewResponseSchema.parse(analysis);
      const analyzedProfile = {
        ...profileWithDocument,
        profileVersion: profileWithDocument.profileVersion + 1,
        updatedAt: new Date().toISOString(),
        documents: profileWithDocument.documents.map((item) =>
          item.id === documentId
            ? {
                ...item,
                analysisStatus: "analyzed" as const,
                summary: analysis.documentSummary,
              }
            : item,
        ),
      };
      await saveProfile(analyzedProfile);

      const assistantContent = [
        `I analyzed ${file.name}. ${analysis.documentSummary}`,
        analysis.assistantReply,
        analysis.followUpQuestion,
      ]
        .filter(Boolean)
        .join("\n\n");
      const completedMessages: ChatMessage[] = [
        ...messages,
        { role: "assistant", content: assistantContent },
      ];
      setMessages(completedMessages);
      setResult(interviewResult);
      setSelected(new Set());
      writeDraft(
        draftKey,
        {
          message,
          messages: completedMessages,
          result: interviewResult,
          selected: [],
          pendingMessage: null,
        },
        true,
      );
      if (analysis.needsFollowUp) {
        queueMicrotask(() => messageInputRef.current?.focus());
      }
    } catch (error) {
      const failedProfile = {
        ...profileWithDocument,
        profileVersion: profileWithDocument.profileVersion + 1,
        updatedAt: new Date().toISOString(),
        documents: profileWithDocument.documents.map((item) =>
          item.id === documentId
            ? { ...item, analysisStatus: "error" as const }
            : item,
        ),
      };
      await saveProfile(failedProfile, { syncEverOS: false });
      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          content:
            error instanceof Error
              ? `I saved the document locally, but could not analyze it: ${error.message}`
              : "I saved the document locally, but could not analyze it.",
        },
      ]);
    } finally {
      setUploadingDocument(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function removeDocument(documentId: string) {
    if (!window.confirm("Remove this document from your local profile?")) return;
    await deleteDocumentFile(profile.userId, documentId);
    await saveProfile({
      ...profile,
      profileVersion: profile.profileVersion + 1,
      updatedAt: new Date().toISOString(),
      documents: profile.documents.filter((item) => item.id !== documentId),
    });
  }

  async function openDocument(documentId: string) {
    const blob = await getDocumentFile(profile.userId, documentId);
    if (!blob) {
      window.alert("This local document is no longer available.");
      return;
    }
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank", "noopener,noreferrer");
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
  }

  async function sendMessage() {
    const trimmed = message.trim();
    if (!trimmed || sending) return;
    const requestDraftKey = draftKey;
    const userMessages: ChatMessage[] = [
      ...messages,
      { role: "user", content: trimmed },
    ];
    setSending(true);
    setMessage("");
    setMessages(userMessages);
    setResult(null);
    setSelected(new Set());
    setPendingMessage(trimmed);
    writeDraft(requestDraftKey, {
      message: "",
      messages: userMessages,
      result: null,
      selected: [],
      pendingMessage: trimmed,
    });

    try {
      const response = await fetch("/api/history/interview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          area,
          message: trimmed,
          conversation: messages.slice(-19),
          context: {
            currentStatus: currentValue(profile.currentStatus),
            currentBasis: currentValue(profile.currentBasis),
            citizenshipCountries:
              profile.citizenshipCountries.state === "known"
                ? profile.citizenshipCountries.value
                : [],
            reviewedFacts: reviewedFactsForArea(profile, area),
            existingEvent: editingEvent
              ? {
                  id: editingEvent.id,
                  type: editingEvent.type,
                  title: editingEvent.title,
                  details: editingEvent.details,
                  date: editingEvent.date,
                  datePrecision: editingEvent.datePrecision,
                  confidence: editingEvent.confidence,
                }
              : null,
          },
        }),
      });
      const body = await response.json();
      if (!response.ok) {
        throw new Error(body.error ?? "Could not review that history");
      }
      const parsed = historyInterviewResponseSchema.parse(body);
      const completedMessages: ChatMessage[] = [
        ...userMessages,
        {
          role: "assistant",
          content: parsed.followUpQuestion
            ? `${parsed.assistantReply}\n\n${parsed.followUpQuestion}`
            : parsed.assistantReply,
        },
      ];
      writeDraft(
        requestDraftKey,
        {
          message: "",
          messages: completedMessages,
          result: parsed,
          selected: [],
          pendingMessage: null,
        },
        true,
      );
      if (activeDraftKeyRef.current === requestDraftKey) {
        setResult(parsed);
        setMessages(completedMessages);
        setPendingMessage(null);
        if (parsed.needsFollowUp) {
          queueMicrotask(() => messageInputRef.current?.focus());
        }
      }
    } catch {
      const failedMessages: ChatMessage[] = [
        ...userMessages,
        {
          role: "assistant",
          content:
            "I couldn’t structure that answer. Your message was not saved. Please try again with one event or fact at a time.",
        },
      ];
      writeDraft(
        requestDraftKey,
        {
          message: trimmed,
          messages: failedMessages,
          result: null,
          selected: [],
          pendingMessage: null,
        },
        true,
      );
      if (activeDraftKeyRef.current === requestDraftKey) {
        setMessages(failedMessages);
        setMessage(trimmed);
        setPendingMessage(null);
      }
    } finally {
      if (activeDraftKeyRef.current === requestDraftKey) {
        setSending(false);
      }
    }
  }

  function toggleSelection(id: string) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function changeArea(nextArea: HistoryAreaId, force = false) {
    if (
      !force &&
      result &&
      !window.confirm(
        "Leave this section? Suggestions you have not saved will be discarded.",
      )
    ) {
      return;
    }
    writeDraft(draftKey, {
      message,
      messages,
      result,
      selected: [...selected],
      pendingMessage,
    });
    setArea(nextArea);
    setMessages([]);
    setResult(null);
    setSelected(new Set());
  }

  async function markReviewed(includeSelected: boolean) {
    setSaving(true);
    try {
      const selectedFacts =
        includeSelected && result
          ? result.factProposals.filter((_, index) =>
              selected.has(`fact-${index}`),
            )
          : [];
      const facts = selectedFacts.filter((proposal) => {
        try {
          validateFactValue(proposal);
          return true;
        } catch {
          return false;
        }
      });
      const events =
        includeSelected && result
          ? result.eventProposals.filter((_, index) =>
              selected.has(`event-${index}`),
            )
          : [];
      const next = confirmHistoryUpdates(
        profile,
        area,
        facts,
        events,
        undefined,
        editingEvent?.id,
      );
      await saveProfile(next);
      window.sessionStorage.removeItem(draftKey);
      setDraftReadyKey(null);
      setResult(null);
      setSelected(new Set());
      setMessages([]);
      setPendingMessage(null);

      if (editingEvent) {
        router.push("/profile");
      } else {
        const nextArea = historyAreas[areaIndex + 1];
        if (nextArea) setArea(nextArea.id);
        else router.push("/runway");
      }
    } catch (error) {
      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          content:
            error instanceof Error
              ? `I couldn’t save these updates: ${error.message}`
              : "I couldn’t save these updates. Please try again.",
        },
      ]);
    } finally {
      setSaving(false);
    }
  }

  const proposalsCount =
    (result?.factProposals.length ?? 0) +
    (result?.eventProposals.length ?? 0);
  const proposalIds = result
    ? [
        ...result.factProposals.map((_, index) => `fact-${index}`),
        ...result.eventProposals.map((_, index) => `event-${index}`),
      ]
    : [];
  const allProposalsSelected =
    proposalIds.length > 0 &&
    proposalIds.every((proposalId) => selected.has(proposalId));

  return (
    <div className="px-6 py-9 md:px-12">
      <div className="mx-auto max-w-6xl">
        <header className="flex flex-wrap items-start justify-between gap-5">
          <div>
            <Link
              href="/runway"
              className="inline-flex items-center gap-2 text-sm font-semibold text-muted hover:text-brand"
            >
              <ArrowLeft className="size-4" /> Back to My Runway
            </Link>
            <p className="mt-6 text-xs font-semibold uppercase tracking-[0.18em] text-brand">
              Guided history
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight">
              Review your immigration story
            </h1>
            <p className="mt-2 max-w-2xl leading-7 text-muted">
              Describe complicated situations naturally. Nothing is added to
              your profile until you review and select it.
            </p>
          </div>
          <div className="rounded-2xl border bg-white px-4 py-3 text-sm shadow-sm">
            <span className="font-semibold">{completion.percentage}%</span>{" "}
            <span className="text-muted">reviewed</span>
          </div>
        </header>

        <div className="mt-8 grid gap-6 lg:grid-cols-[280px_1fr]">
          <aside className="h-fit rounded-3xl border bg-white p-4 shadow-sm">
            <p className="px-2 pb-3 text-xs font-semibold uppercase tracking-[0.16em] text-muted">
              History areas
            </p>
            <div className="space-y-1.5">
              {historyAreas.map((item) => {
                const state = profile.historyReview[item.id];
                return (
                  <button
                    type="button"
                    key={item.id}
                    onClick={() => changeArea(item.id)}
                    className={`flex w-full items-center justify-between rounded-xl px-3 py-3 text-left text-sm ${
                      area === item.id
                        ? "bg-brand-soft font-semibold text-brand"
                        : "hover:bg-slate-50"
                    }`}
                  >
                    {item.label}
                    {state === "reviewed" ? (
                      <Check className="size-4 text-brand" />
                    ) : (
                      <CircleHelp className="size-4 text-amber-600" />
                    )}
                  </button>
                );
              })}
            </div>
          </aside>

          <section className="overflow-hidden rounded-3xl border bg-white shadow-sm">
            <div className="border-b bg-slate-50 px-6 py-5">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <span className="grid size-10 place-items-center rounded-xl bg-brand-soft text-brand">
                    <Bot className="size-5" />
                  </span>
                  <div>
                    <h2 className="font-semibold">{selectedArea.label}</h2>
                    <p className="text-xs text-muted">
                      Section {areaIndex + 1} of {historyAreas.length}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={areaIndex === 0}
                    onClick={() =>
                      changeArea(historyAreas[areaIndex - 1].id)
                    }
                    className="inline-flex items-center gap-1.5 rounded-xl border bg-white px-3 py-2 text-xs font-semibold disabled:opacity-40"
                  >
                    <ArrowLeft className="size-3.5" /> Previous
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const nextArea = historyAreas[areaIndex + 1];
                      if (nextArea) changeArea(nextArea.id);
                      else router.push("/runway");
                    }}
                    className="inline-flex items-center gap-1.5 rounded-xl border bg-white px-3 py-2 text-xs font-semibold"
                  >
                    {areaIndex === historyAreas.length - 1
                      ? "Back to runway"
                      : "Next section"}
                    <ArrowRight className="size-3.5" />
                  </button>
                </div>
              </div>
            </div>

            <div className="min-h-80 space-y-4 p-6">
              {areaDocuments.length > 0 && (
                <div className="max-w-2xl space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">
                    Documents saved for this section
                  </p>
                  {areaDocuments.map((document) => (
                    <div
                      key={document.id}
                      className="flex items-start justify-between gap-3 rounded-xl border bg-white p-3"
                    >
                      <div className="flex min-w-0 gap-3">
                        <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-sky-50 text-sky-700">
                          <FileText className="size-4" />
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold">
                            {document.name}
                          </p>
                          <p className="mt-0.5 text-xs capitalize text-muted">
                            {document.analysisStatus} ·{" "}
                            {(document.size / 1024 / 1024).toFixed(1)} MB
                          </p>
                          {document.summary && (
                            <p className="mt-1 text-xs leading-5 text-muted">
                              {document.summary}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <button
                          type="button"
                          aria-label={`Open ${document.name}`}
                          onClick={() => void openDocument(document.id)}
                          className="rounded-lg p-2 text-muted hover:bg-slate-100 hover:text-brand"
                        >
                          <ExternalLink className="size-3.5" />
                        </button>
                        <button
                          type="button"
                          aria-label={`Remove ${document.name}`}
                          onClick={() => void removeDocument(document.id)}
                          className="rounded-lg p-2 text-muted hover:bg-rose-50 hover:text-rose-700"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {editingEvent && (
                <div className="max-w-2xl rounded-2xl border border-violet-200 bg-violet-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-violet-700">
                    Editing saved history
                  </p>
                  <p className="mt-2 text-sm font-semibold text-violet-950">
                    {editingEvent.title}
                  </p>
                  <p className="mt-1 text-xs leading-5 text-violet-900/70">
                    {editingEvent.details || "No additional details saved."}
                  </p>
                  <p className="mt-2 text-xs text-violet-800">
                    Tell the agent what is incorrect, missing, or needs clearer
                    wording. The saved event stays unchanged until you confirm
                    a replacement.
                  </p>
                </div>
              )}
              <div className="max-w-2xl rounded-2xl bg-brand-soft p-4 text-sm leading-6 text-brand">
                {editingEvent
                  ? "What should be corrected or added to this event?"
                  : selectedArea.prompt}
              </div>
              {messages.map((item, index) => (
                <div
                  key={`${item.role}-${index}`}
                  className={`flex gap-3 ${
                    item.role === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  <div
                    className={`max-w-2xl whitespace-pre-line rounded-2xl px-4 py-3 text-sm leading-6 ${
                      item.role === "user"
                        ? "bg-[#183e35] text-white"
                        : "bg-slate-100"
                    }`}
                  >
                    {item.content}
                  </div>
                </div>
              ))}
              {sending && (
                <p className="text-sm text-muted">
                  Reviewing only what you shared…
                </p>
              )}
              {!sending && pendingMessage && !result && (
                <div className="rounded-2xl border border-sky-200 bg-sky-50 p-4 text-sm text-sky-900">
                  <p className="font-semibold">Review still in progress</p>
                  <p className="mt-1 text-xs leading-5 text-sky-800/75">
                    You can wait here for the result. If the page was refreshed,
                    restore the message below and submit it again.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setMessage(pendingMessage);
                      setPendingMessage(null);
                    }}
                    className="mt-3 text-xs font-semibold underline"
                  >
                    Restore message to retry
                  </button>
                </div>
              )}

              {result && proposalsCount > 0 && (
                <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50/50 p-5">
                  <div className="flex items-start gap-3">
                    <ShieldCheck className="mt-0.5 size-5 text-amber-700" />
                    <div>
                      <h3 className="font-semibold text-amber-950">
                        {result.needsFollowUp
                          ? "Draft profile updates"
                          : "Review proposed profile updates"}
                      </h3>
                      <p className="mt-1 text-xs leading-5 text-amber-900/70">
                        {result.needsFollowUp
                          ? "These suggestions will keep improving as you answer the chat follow-up. You do not need to save them yet."
                          : "Select only accurate items. Nothing becomes a rule input until you confirm it."}
                      </p>
                      {result.needsFollowUp && (
                        <span className="mt-2 inline-flex rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-semibold text-amber-800">
                          Answer the chat before saving
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="mt-4 space-y-3">
                    {result.factProposals.map((proposal, index) => (
                      <label
                        key={`fact-${index}`}
                        className="flex cursor-pointer items-start gap-3 rounded-xl border bg-white p-4"
                      >
                        <input
                          type="checkbox"
                          className="mt-1"
                          checked={selected.has(`fact-${index}`)}
                          onChange={() => toggleSelection(`fact-${index}`)}
                        />
                        <span>
                          <span className="block text-sm font-semibold">
                            {proposal.label}
                          </span>
                          <span className="mt-1 block text-xs text-muted">
                            {Array.isArray(proposal.value)
                              ? proposal.value.join(", ")
                              : String(proposal.value)}
                          </span>
                        </span>
                      </label>
                    ))}
                    {result.eventProposals.map((event, index) => (
                      <label
                        key={`event-${index}`}
                        className="flex cursor-pointer items-start gap-3 rounded-xl border bg-white p-4"
                      >
                        <input
                          type="checkbox"
                          className="mt-1"
                          checked={selected.has(`event-${index}`)}
                          onChange={() => toggleSelection(`event-${index}`)}
                        />
                        <span>
                          <span className="block text-sm font-semibold">
                            {event.title}
                          </span>
                          <span className="mt-1 block text-xs leading-5 text-muted">
                            {event.date ?? "Date not confirmed"} ·{" "}
                            {event.details || "No additional detail"}
                          </span>
                        </span>
                      </label>
                    ))}
                  </div>
                  {result.needsFollowUp && (
                    <p className="mt-4 rounded-xl bg-white/70 p-3 text-xs leading-5 text-amber-900">
                      Use the chat box below to answer the single follow-up
                      question. If you do not know the answer, say “I don’t
                      know” and the interview will move on.
                    </p>
                  )}
                  <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                    <p className="text-xs text-amber-900/75">
                      Choose one item, several items, or all of them.
                    </p>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setSelected(new Set(proposalIds))}
                        disabled={allProposalsSelected}
                        className="rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-xs font-semibold text-amber-900 disabled:opacity-45"
                      >
                        Select all
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelected(new Set())}
                        disabled={selected.size === 0}
                        className="rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-xs font-semibold text-amber-900 disabled:opacity-45"
                      >
                        Clear all
                      </button>
                    </div>
                  </div>
                  <button
                    type="button"
                    disabled={saving || selected.size === 0}
                    onClick={() => void markReviewed(true)}
                    className={`mt-4 rounded-xl px-4 py-2.5 text-sm font-semibold disabled:opacity-50 ${
                      result.needsFollowUp
                        ? "border border-amber-300 bg-white text-amber-900"
                        : "bg-brand text-white"
                    }`}
                  >
                    {saving
                      ? "Saving…"
                      : editingEvent
                        ? "Replace with selected update"
                        : result.needsFollowUp
                          ? "Mark as done"
                          : "Add selected and mark reviewed"}
                  </button>
                </div>
              )}
            </div>

            <div className="border-t p-5">
              <div className="flex gap-3">
                <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-slate-100 text-muted">
                  <UserRound className="size-4" />
                </div>
                <textarea
                  ref={messageInputRef}
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !event.shiftKey) {
                      event.preventDefault();
                      void sendMessage();
                    }
                  }}
                  rows={3}
                  maxLength={2500}
                  placeholder={
                    result?.needsFollowUp
                      ? "Answer the follow-up above, or say “I don’t know”…"
                      : editingEvent
                      ? "Explain what should change, including corrected dates or details…"
                      : "Describe what happened, including dates only when you know them…"
                  }
                  className="min-w-0 flex-1 resize-none rounded-xl border px-3.5 py-3 text-sm outline-none focus:border-brand"
                />
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="application/pdf,image/jpeg,image/png"
                  className="hidden"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) void uploadDocument(file);
                  }}
                />
                <button
                  type="button"
                  aria-label="Attach immigration document"
                  title="Attach PDF, JPEG, or PNG"
                  disabled={uploadingDocument || sending}
                  onClick={() => fileInputRef.current?.click()}
                  className="grid size-11 shrink-0 place-items-center rounded-xl border bg-white text-muted hover:text-brand disabled:opacity-50"
                >
                  <Paperclip className="size-4" />
                </button>
                <button
                  type="button"
                  aria-label="Send history detail"
                  disabled={!message.trim() || sending}
                  onClick={() => void sendMessage()}
                  className="grid size-11 shrink-0 place-items-center rounded-xl bg-brand text-white disabled:opacity-50"
                >
                  <Send className="size-4" />
                </button>
              </div>
              <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                <p className="text-xs text-muted">
                  {uploadingDocument
                    ? "Saving locally and analyzing the document…"
                    : "Attach PDF/JPEG/PNG up to 10 MB. A local copy is linked to your profile; analysis sends the selected file to the configured AI service."}
                </p>
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => void markReviewed(false)}
                  className="text-xs font-semibold text-brand hover:underline"
                >
                  Nothing to add — mark this area reviewed
                </button>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
