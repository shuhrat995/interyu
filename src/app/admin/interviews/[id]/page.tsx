"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

type AiResult = {
  score?: number;
  verdict?: string;
  strengths?: string[];
  gaps?: string[];
  misconceptions?: string[];
  interviewer_note?: string;
  followup?: string | null;
  provider?: string;
};

type TranscriptItem = {
  id: string;
  questionId: string;
  questionVersion: number;
  questionText: string;
  topic: { name: string; color: string } | null;
  difficulty: number;
  type: string;
  timeLimit: number;
  selectedIndex: number | null;
  answerText: string | null;
  isCorrect: boolean | null;
  aiScore: number | null;
  ai: AiResult | null;
  timeSpent: number;
  createdAt: string;
};

type Note = { id: string; body: string; createdAt: string; author?: { name?: string } | null };
type Tag = { id: string; label: string; color: string };
type CriticalIssue = { issue: string; evidence?: string; severity?: string };
type FocusArea = { topic: string; priority?: number; why: string; how: string };
type TopicStat = { topic: string; total: number; wrong: number; avgScore: number | null };

type Report = {
  level?: string;
  overall_score?: number;
  summary?: string;
  strengths?: string[];
  weaknesses?: string[];
  critical_issues?: CriticalIssue[];
  focus_areas?: FocusArea[];
  topics_to_improve?: FocusArea[];
  topic_stats?: TopicStat[];
  hiring_recommendation?: string;
  culture_note?: string;
  next_steps?: string[];
  provider?: string;
};

type Detail = {
  interview: {
    id: string;
    candidateName: string;
    status: string;
    track?: string | null;
    currentLevel: number;
    startedAt: string;
    finishedAt: string | null;
  };
  report: Report | null;
  antiCheat: { questionId?: string; tabSwitches?: number; pasted?: boolean; at?: string }[];
  transcript: TranscriptItem[];
  notes: Note[];
  tags: Tag[];
};

const QUICK_TAGS = ["kuchli", "o'rtacha", "zaif", "recommended", "rejected", "follow-up"];

export default function InterviewDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [data, setData] = useState<Detail | null>(null);
  const [err, setErr] = useState("");
  const [noteText, setNoteText] = useState("");
  const [tagText, setTagText] = useState("");
  const [open, setOpen] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch(`/api/interviews/${id}`);
    if (res.ok) setData(await res.json());
    else setErr("Intervyu topilmadi");
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  async function patch(body: Record<string, unknown>) {
    await fetch(`/api/interviews/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    load();
  }

  if (err) return <div className="card p-4 text-bad text-sm">{err}</div>;
  if (!data) return <p className="text-mut text-sm">Yuklanmoqda...</p>;

  const { interview, report, antiCheat, transcript, notes, tags } = data;
  const rec = report?.hiring_recommendation;

  return (
    <div className="space-y-4 max-w-4xl">
      <button className="btn-ghost text-xs" onClick={() => router.push("/admin/interviews")}>← Ro'yxat</button>

      {/* Sarlavha */}
      <div className="card p-5 flex flex-wrap items-center gap-4">
        <div className="flex-1 min-w-40">
          <h1 className="text-xl font-semibold">{interview.candidateName}</h1>
          <p className="text-xs text-mut">
            {new Date(interview.startedAt).toLocaleString("uz-UZ", { dateStyle: "long", timeStyle: "short" })}
            {interview.finishedAt && ` → ${new Date(interview.finishedAt).toLocaleTimeString("uz-UZ", { timeStyle: "short" })}`}
            {" · "}holat: {interview.status}
            {interview.track && (
              <>
                {" · "}
                <span className="badge border-acc/40 text-acc">
                  {interview.track === "backend" ? "Back-end" : "Front-end"}
                </span>
              </>
            )}
          </p>
        </div>
        {report && (
          <>
            <div className="text-center">
              <div className="text-3xl font-bold tabular-nums">{report.overall_score}</div>
              <div className="text-xs text-mut">umumiy ball</div>
            </div>
            <div className="badge border-acc/50 text-acc">{report.level}</div>
            {rec === "ha" && <span className="badge border-ok/50 text-ok">Tavsiya: ha</span>}
            {rec === "yo'q" && <span className="badge border-bad/50 text-bad">Tavsiya: yo'q</span>}
            {rec === "shartli" && <span className="badge border-warn/50 text-warn">Tavsiya: shartli</span>}
          </>
        )}
        <div className="flex flex-wrap gap-1">
          {tags.map((t) => (
            <button
              key={t.id}
              className="badge cursor-pointer hover:opacity-80"
              style={{ borderColor: t.color, color: t.color }}
              onClick={() => patch({ removeTagId: t.id })}
              title="O'chirish uchun bosing"
            >
              {t.label} ✕
            </button>
          ))}
        </div>
      </div>

      {/* Yakuniy AI hisobot */}
      {report && (
        <div className="card p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">AI yakuniy xulosa {report.provider === "mock" && <span className="badge border-warn/40 text-warn ml-1">mock</span>}</h2>
          </div>
          {report.summary && <p className="text-sm">{report.summary}</p>}
          <div className="grid md:grid-cols-2 gap-3">
            {(report.strengths?.length ?? 0) > 0 && (
              <div>
                <div className="text-xs font-medium text-ok mb-1">Kuchli tomonlar</div>
                <ul className="text-sm list-disc pl-4 space-y-0.5">
                  {report.strengths?.map((s, i) => <li key={i}>{s}</li>)}
                </ul>
              </div>
            )}
            {(report.weaknesses?.length ?? 0) > 0 && (
              <div>
                <div className="text-xs font-medium text-bad mb-1">Zaif tomonlar</div>
                <ul className="text-sm list-disc pl-4 space-y-0.5">
                  {report.weaknesses?.map((s, i) => <li key={i}>{s}</li>)}
                </ul>
              </div>
            )}
          </div>
          {(report.critical_issues?.length ?? 0) > 0 && (
            <div>
              <div className="text-xs font-medium text-bad mb-1">🚨 Jiddiy muammolar (ochiq tanqid)</div>
              <ul className="text-sm space-y-1.5">
                {report.critical_issues?.map((c, i) => (
                  <li key={i}>
                    <span className="badge border-line text-mut mr-1">{c.severity ?? "past"}</span>
                    {c.issue}
                    {c.evidence && <div className="text-xs text-mut pl-1">Dalil: {c.evidence}</div>}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {(() => {
            const focus = report.focus_areas?.length ? report.focus_areas : (report.topics_to_improve ?? []);
            return focus.length > 0 ? (
              <div>
                <div className="text-xs font-medium text-warn mb-1">🎯 Focus qaratish kerak (ustuvorlik bilan)</div>
                <ul className="text-sm space-y-1">
                  {focus.map((t, i) => (
                    <li key={i}>
                      <b>{t.priority ?? i + 1}. {t.topic}</b> — {t.why} <span className="text-mut">({t.how})</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null;
          })()}
          {(report.topic_stats?.length ?? 0) > 0 && (
            <div>
              <div className="text-xs font-medium mb-1">📊 Mavzular kesimida</div>
              <table className="w-full text-sm">
                <tbody>
                  {report.topic_stats?.map((s, i) => (
                    <tr key={i} className="border-b border-line/50 last:border-0">
                      <td className="py-1">{s.topic}</td>
                      <td className="py-1 tabular-nums text-mut">
                        {s.total - s.wrong}/{s.total} to&apos;g&apos;ri
                      </td>
                      <td className="py-1 tabular-nums text-mut">
                        {s.avgScore !== null ? `o'rtacha ${s.avgScore}/100` : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {report.culture_note && <p className="text-xs text-mut">Fikrlash uslubi: {report.culture_note}</p>}
        </div>
      )}

      {/* Anti-cheat */}
      {antiCheat.length > 0 && (
        <div className="card p-4 border-warn/40">
          <h2 className="text-sm font-semibold text-warn mb-2">⚠ Anti-cheat loglari ({antiCheat.length})</h2>
          <ul className="text-xs space-y-1">
            {antiCheat.map((e, i) => (
              <li key={i}>
                {e.at && <span className="text-mut">{new Date(e.at).toLocaleTimeString("uz-UZ")} — </span>}
                {e.tabSwitches ? `tab almashgan: ${e.tabSwitches}` : ""}
                {e.pasted ? "paste ishlatilgan" : ""}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Transkript */}
      <div className="space-y-2">
        <h2 className="text-sm font-semibold">Transkript ({transcript.length} savol)</h2>
        {transcript.map((t, idx) => {
          const isOpen = open === t.id;
          return (
            <div key={t.id} className="card">
              <button
                className="w-full text-left p-4 flex items-start gap-3"
                onClick={() => setOpen(isOpen ? null : t.id)}
                aria-expanded={isOpen}
              >
                <span className="badge border-line text-mut shrink-0">{idx + 1}</span>
                <span className="flex-1 min-w-0">
                  <span className="block text-sm font-medium truncate">{t.questionText}</span>
                  <span className="block text-xs text-mut mt-1">
                    {t.topic?.name} · {t.difficulty}/5 · {t.type === "mcq" ? "MCQ" : "yozma"} · {Math.floor(t.timeSpent / 60)}:{String(t.timeSpent % 60).padStart(2, "0")}
                  </span>
                </span>
                <span className="shrink-0 flex items-center gap-2">
                  {t.type === "mcq" ? (
                    <span className={`badge ${t.isCorrect ? "border-ok/50 text-ok" : "border-bad/50 text-bad"}`}>{t.isCorrect ? "✓" : "✗"}</span>
                  ) : (
                    t.aiScore !== null && (
                      <span className={`badge ${t.aiScore >= 70 ? "border-ok/50 text-ok" : t.aiScore >= 40 ? "border-warn/50 text-warn" : "border-bad/50 text-bad"}`}>
                        AI: {t.aiScore}
                      </span>
                    )
                  )}
                  <span className="text-mut text-xs">{isOpen ? "▲" : "▼"}</span>
                </span>
              </button>

              {isOpen && (
                <div className="px-4 pb-4 space-y-3 border-t border-line pt-3">
                  <div>
                    <div className="text-xs text-mut mb-1">Javob</div>
                    <div className="text-sm bg-bg rounded-md p-3 whitespace-pre-wrap">
                      {t.type === "mcq"
                        ? `Variant ${t.selectedIndex !== null ? "ABCDE"[t.selectedIndex] : "—"} tanlangan`
                        : t.answerText || "—"}
                    </div>
                    <div className="text-xs text-mut mt-1">
                      savol v{t.questionVersion} · limit {t.timeLimit}s
                    </div>
                  </div>

                  {t.ai && (
                    <div className="text-sm space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="badge border-acc/40 text-acc">Ball: {t.ai.score ?? "—"}/100</span>
                        {t.ai.verdict && <span className="badge border-line text-mut">{t.ai.verdict}</span>}
                        {t.ai.provider === "mock" && <span className="badge border-warn/40 text-warn">mock baho</span>}
                      </div>
                      {(t.ai.strengths?.length ?? 0) > 0 && (
                        <div>
                          <div className="text-xs text-ok mb-0.5">Kuchli:</div>
                          <ul className="list-disc pl-4">{t.ai.strengths?.map((s, i) => <li key={i}>{s}</li>)}</ul>
                        </div>
                      )}
                      {(t.ai.gaps?.length ?? 0) > 0 && (
                        <div>
                          <div className="text-xs text-bad mb-0.5">Yetishmaydi:</div>
                          <ul className="list-disc pl-4">{t.ai.gaps?.map((s, i) => <li key={i}>{s}</li>)}</ul>
                        </div>
                      )}
                      {(t.ai.misconceptions?.length ?? 0) > 0 && (
                        <div>
                          <div className="text-xs text-warn mb-0.5">Noto'g'ri tushunchalar:</div>
                          <ul className="list-disc pl-4">{t.ai.misconceptions?.map((s, i) => <li key={i}>{s}</li>)}</ul>
                        </div>
                      )}
                      {t.ai.interviewer_note && (
                        <div className="text-xs text-mut">💬 Intervyuer izohi: {t.ai.interviewer_note}</div>
                      )}
                      {t.ai.followup && <div className="text-xs text-acc">➜ Follow-up taklifi: {t.ai.followup}</div>}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Izohlar */}
      <div className="card p-4 space-y-3">
        <h2 className="text-sm font-semibold">Rekruter izohlari ({notes.length})</h2>
        <ul className="space-y-2">
          {notes.map((n) => (
            <li key={n.id} className="bg-bg rounded-md p-3 text-sm">
              <div className="text-xs text-mut mb-1">
                {n.author?.name ?? "—"} · {new Date(n.createdAt).toLocaleString("uz-UZ", { dateStyle: "short", timeStyle: "short" })}
              </div>
              {n.body}
            </li>
          ))}
          {notes.length === 0 && <li className="text-sm text-mut">Hozircha izoh yo'q</li>}
        </ul>
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (!noteText.trim()) return;
            patch({ note: noteText.trim() });
            setNoteText("");
          }}
        >
          <input
            className="flex-1"
            placeholder="Izoh qo'shish..."
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            aria-label="Yangi izoh"
          />
          <button className="btn-primary" disabled={!noteText.trim()}>Qo'shish</button>
        </form>
      </div>

      {/* Teglar */}
      <div className="card p-4 space-y-3">
        <h2 className="text-sm font-semibold">Teglar</h2>
        <div className="flex flex-wrap gap-1.5">
          {QUICK_TAGS.filter((q) => !tags.some((t) => t.label === q)).map((q) => (
            <button key={q} className="btn-ghost text-xs" onClick={() => patch({ addTag: { label: q } })}>
              + {q}
            </button>
          ))}
        </div>
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (!tagText.trim()) return;
            patch({ addTag: { label: tagText.trim() } });
            setTagText("");
          }}
        >
          <input
            className="flex-1"
            placeholder="Maxsus teg..."
            value={tagText}
            onChange={(e) => setTagText(e.target.value)}
            aria-label="Yangi teg"
          />
          <button className="btn-ghost" disabled={!tagText.trim()}>Qo'shish</button>
        </form>
      </div>
    </div>
  );
}
