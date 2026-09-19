"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { TRACKS, getTrack, type TrackSlug } from "@/lib/tracks";

type Question = {
  id: string;
  type: "mcq" | "written";
  difficulty: number;
  text: string;
  options: string[];
  timeLimit: number;
  index: number;
  total: number;
};

type CriticalIssue = { issue: string; evidence: string; severity?: "yuqori" | "o'rta" | "past" };
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

type Phase = "welcome" | "question" | "report";

export default function InterviewPage() {
  const [phase, setPhase] = useState<Phase>("welcome");
  const [welcomeStep, setWelcomeStep] = useState<"name" | "track">("name");
  const [name, setName] = useState("");
  const [track, setTrack] = useState<TrackSlug | null>(null);
  const [pendingTrack, setPendingTrack] = useState<TrackSlug | null>(null);
  const [interviewId, setInterviewId] = useState<string | null>(null);
  const [question, setQuestion] = useState<Question | null>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const [text, setText] = useState("");
  const [remaining, setRemaining] = useState(0);
  const [busy, setBusy] = useState(false);
  const [gradingSeconds, setGradingSeconds] = useState(0);
  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState<{ isCorrect: boolean; aiScore: number | null } | null>(null);
  const [report, setReport] = useState<Report | null>(null);
  const [level, setLevel] = useState(0);
  const [answered, setAnswered] = useState(0);
  const [pasted, setPasted] = useState(false);
  const [tabSwitches, setTabSwitches] = useState(0);
  const questionStart = useRef<number>(Date.now());
  const resumedRef = useRef(false);

  // Draft: yozilgan matn/tanlov localStorage'da saqlanadi (refresh himoyasi)
  const draftKey = interviewId && question ? `draft:${interviewId}:${question.id}` : null;

  useEffect(() => {
    if (!draftKey) return;
    try {
      const raw = localStorage.getItem(draftKey);
      if (raw) {
        const d = JSON.parse(raw) as { text?: string; selected?: number | null };
        if (typeof d.text === "string") setText(d.text);
        if (typeof d.selected === "number") setSelected(d.selected);
      } else {
        setText("");
        setSelected(null);
      }
    } catch {
      /* ignore */
    }
  }, [draftKey]);

  useEffect(() => {
    if (!draftKey) return;
    try {
      if (text.trim() || selected !== null) {
        localStorage.setItem(draftKey, JSON.stringify({ text, selected }));
      } else {
        localStorage.removeItem(draftKey);
      }
    } catch {
      /* ignore */
    }
  }, [draftKey, text, selected]);

  function clearDraft() {
    if (draftKey) {
      try {
        localStorage.removeItem(draftKey);
      } catch {
        /* ignore */
      }
    }
  }

  // Resume: localStorage'dagi sessiyani tiklash (TZ 5.3.8)
  useEffect(() => {
    if (resumedRef.current) return;
    resumedRef.current = true;
    const saved = localStorage.getItem("ai_interview_session");
    if (!saved) return;
    fetch(`/api/interview/${saved}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        if (!j) return;
        if (j.track) setTrack(j.track as TrackSlug);
        if (j.status === "in_progress" && j.question) {
          setInterviewId(saved);
          setQuestion(j.question);
          setLevel(j.currentLevel ?? 0);
          setAnswered(j.answered ?? 0);
          if (j.question.servedAt) {
            const elapsed = Math.floor((Date.now() - new Date(j.question.servedAt).getTime()) / 1000);
            setRemaining(Math.max(0, j.question.timeLimit - elapsed));
          } else {
            setRemaining(j.question.timeLimit);
          }
          questionStart.current = Date.now();
          setPhase("question");
        } else if (j.status === "finished" && j.report) {
          setInterviewId(saved);
          setReport(j.report);
          setPhase("report");
        }
      })
      .catch(() => {});
  }, []);

  // Anti-cheat: tab almashinuvi (TZ 5.4)
  useEffect(() => {
    function onVis() {
      if (document.visibilityState === "hidden" && phase === "question") {
        setTabSwitches((n) => n + 1);
      }
    }
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [phase]);

  // Baholash davomida sekund hisoblagichi — kutish "qotib qolgan"dek tuyulmasin
  useEffect(() => {
    if (!busy) {
      setGradingSeconds(0);
      return;
    }
    const t = setInterval(() => setGradingSeconds((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [busy]);

  const submit = useCallback(
    async (auto: boolean) => {
      if (!interviewId || !question || busy) return;
      if (!auto) {
        if (question.type === "mcq" && selected === null) return;
        if (question.type === "written" && text.trim().length < 15) return;
      }
      setBusy(true);
      setError("");
      try {
        const res = await fetch("/api/interview/answer", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            interviewId,
            questionId: question.id,
            selectedIndex: question.type === "mcq" ? selected : null,
            answerText: question.type === "written" ? text : null,
            timeSpent: Math.floor((Date.now() - questionStart.current) / 1000),
            tabSwitches,
            pasted
          })
        });
        const j = await res.json();
        if (!res.ok) {
          setError(j.error || "Xatolik");
          return;
        }
        setFeedback(j.evaluated);
        setPasted(false);
        setTabSwitches(0);
        clearDraft();
        setSelected(null);
        setText("");
        if (j.next) {
          setQuestion(j.next);
          setRemaining(j.next.timeLimit);
          questionStart.current = Date.now();
          if (j.evaluated) setAnswered((n) => n + 1);
          setTimeout(() => setFeedback(null), 2200);
        } else {
          setQuestion(null);
          // Yakuniy hisobot
          const fr = await fetch("/api/interview/finish", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ interviewId })
          });
          const fj = await fr.json();
          if (fr.ok) {
            setReport(fj.report);
            localStorage.removeItem("ai_interview_session");
          } else {
            setError(fj.error || "Hisobot xatosi");
          }
          setPhase("report");
        }
      } finally {
        setBusy(false);
      }
    },
    [interviewId, question, busy, selected, text, tabSwitches, pasted]
  );

  // Timer: 0 bo'lsa avtomatik yuborish (TZ 5.3.3)
  useEffect(() => {
    if (phase !== "question" || !question) return;
    if (remaining <= 0) {
      submit(true);
      return;
    }
    const t = setTimeout(() => setRemaining((r) => r - 1), 1000);
    return () => clearTimeout(t);
  }, [phase, question, remaining, submit]);

  // Klaviatura: 1-5 variant, ⌘/Ctrl+Enter yuborish (TZ 5.3.2)
  useEffect(() => {
    if (phase !== "question" || !question) return;
    function onKey(e: KeyboardEvent) {
      if (!question) return;
      if (question.type === "mcq" && /^[1-5]$/.test(e.key)) {
        const idx = Number(e.key) - 1;
        if (idx < question.options.length) setSelected(idx);
      } else if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
        submit(false);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [phase, question, submit]);

  async function start(trackSlug: TrackSlug) {
    if (name.trim().length < 2) {
      setWelcomeStep("name");
      return;
    }
    setPendingTrack(trackSlug);
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/interview/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), track: trackSlug })
      });
      const j = await res.json();
      if (!res.ok) {
        setError(j.error || "Xatolik");
        return;
      }
      localStorage.setItem("ai_interview_session", j.interviewId);
      setInterviewId(j.interviewId);
      setTrack(j.track ?? trackSlug);
      setQuestion(j.question);
      setRemaining(j.question.timeLimit);
      setAnswered(0);
      setLevel(0);
      questionStart.current = Date.now();
      setPhase("question");
    } finally {
      setBusy(false);
      setPendingTrack(null);
    }
  }

  const progress = question ? Math.round(((question.index - 1) / question.total) * 100) : phase === "report" ? 100 : 0;
  const canSubmit = question && (question.type === "mcq" ? selected !== null : text.trim().length >= 15);

  if (phase === "welcome") {
    return (
      <main className="min-h-screen flex items-center justify-center p-4">
        <div className="card w-full max-w-md p-6 space-y-4">
          <div className="text-center">
            <div className="text-4xl mb-2" aria-hidden>🎯</div>
            <h1 className="text-2xl font-semibold">O&apos;z darajangizni aniqlang</h1>
            <p className="text-sm text-mut mt-2">
              {welcomeStep === "name"
                ? "12 savol · adaptiv qiyinlik · AI baholash · o'tkazib yuborish mumkin emas"
                : "Savollar qaysi yo'nalishdan bo'lsin?"}
            </p>
          </div>

          {error && <div className="rounded-md border border-bad/40 bg-bad/10 px-3 py-2 text-sm text-bad">{error}</div>}

          {welcomeStep === "name" ? (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (name.trim().length >= 2) setWelcomeStep("track");
              }}
              className="space-y-3"
            >
              <div>
                <label className="label" htmlFor="cand">Ismingiz</label>
                <input
                  id="cand"
                  className="w-full text-base py-2.5"
                  placeholder="Masalan: Shuhrat"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  minLength={2}
                  required
                  autoFocus
                />
              </div>
              <button
                type="submit"
                className="btn-primary w-full justify-center text-base py-3"
                disabled={name.trim().length < 2}
              >
                Davom etish →
              </button>
              <p className="text-xs text-mut text-center">Savolga kirgach vaqt hisoblanadi — tayyor bo&apos;ling!</p>
            </form>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-mut">
                <span>👤 {name.trim()}</span>
                <button type="button" className="hover:text-acc" onClick={() => setWelcomeStep("name")}>
                  ← o&apos;zgartirish
                </button>
              </div>
              {TRACKS.map((t) => (
                <button
                  key={t.slug}
                  type="button"
                  onClick={() => start(t.slug)}
                  disabled={busy}
                  className="w-full text-left card p-4 hover:border-acc transition-colors disabled:opacity-60"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl" aria-hidden>{t.icon}</span>
                    <div className="flex-1">
                      <div className="font-semibold">{t.label}</div>
                      <div className="text-xs text-mut mt-0.5">{t.description}</div>
                    </div>
                    <span className="text-acc text-sm">
                      {pendingTrack === t.slug ? "Boshlanmoqda..." : "Boshlash →"}
                    </span>
                  </div>
                </button>
              ))}
              <p className="text-xs text-mut text-center">
                Yo&apos;nalish faqat savollar tanloviga ta&apos;sir qiladi — daraja baribir adaptiv aniqlanadi.
              </p>
            </div>
          )}

          <Link href="/" className="block text-center text-xs text-mut hover:text-acc">
            ← Asosiy sahifa
          </Link>
        </div>
      </main>
    );
  }

  if (phase === "report" && report) {
    const rec = report.hiring_recommendation;
    const recClass = rec === "ha" ? "border-ok/50 text-ok" : rec === "yo'q" ? "border-bad/50 text-bad" : "border-warn/50 text-warn";
    const focus = report.focus_areas?.length ? report.focus_areas : (report.topics_to_improve ?? []);
    const sevClass = (s?: string) =>
      s === "yuqori" ? "border-bad/50 text-bad" : s === "o'rta" ? "border-warn/50 text-warn" : "border-line text-mut";
    return (
      <main className="min-h-screen p-4 md:p-8 max-w-2xl mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold">Intervyu yakuni</h1>
          {track && <span className="badge border-acc/40 text-acc">{getTrack(track).label}</span>}
        </div>

        <div className="card p-5 flex items-center gap-4">
          <div className="text-4xl font-bold tabular-nums">{report.overall_score ?? "—"}</div>
          <div className="flex-1">
            <div className="badge border-acc/50 text-acc">{report.level ?? "—"}</div>
            <div className="text-sm text-mut mt-1">
              Tavsiya: <span className={`badge ${recClass}`}>{rec ?? "—"}</span>
            </div>
          </div>
          <span className="badge border-line text-mut" title="Hisobot qanday tuzilgani">
            {report.provider === "mock" ? "📊 statistik tahlil" : "🤖 AI tahlili"}
          </span>
        </div>

        {report.summary && <div className="card p-4 text-sm leading-relaxed">{report.summary}</div>}

        {(report.critical_issues?.length ?? 0) > 0 && (
          <div className="card p-4 border-bad/40">
            <h2 className="text-sm font-semibold mb-3 text-bad">🚨 Jiddiy muammolar — ochiq aytamiz</h2>
            <ul className="space-y-3">
              {report.critical_issues?.map((c, i) => (
                <li key={i}>
                  <div className="flex items-start gap-2">
                    <span className={`badge shrink-0 ${sevClass(c.severity)}`}>
                      {c.severity ?? "past"}
                    </span>
                    <span className="text-sm font-medium">{c.issue}</span>
                  </div>
                  {c.evidence && <p className="text-xs text-mut mt-1 pl-1">Dalil: {c.evidence}</p>}
                </li>
              ))}
            </ul>
          </div>
        )}

        {focus.length > 0 && (
          <div className="card p-4">
            <h2 className="text-sm font-semibold mb-3">🎯 Nimaga focus qaratish kerak</h2>
            <ol className="space-y-3">
              {focus.map((f, i) => (
                <li key={i} className="flex gap-3">
                  <span className="w-6 h-6 shrink-0 rounded-full bg-acc/15 text-acc text-xs flex items-center justify-center font-semibold">
                    {f.priority ?? i + 1}
                  </span>
                  <div>
                    <div className="text-sm font-medium">{f.topic}</div>
                    <p className="text-xs text-mut mt-0.5">{f.why}</p>
                    <p className="text-xs text-acc mt-1">→ {f.how}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-3">
          {(report.strengths?.length ?? 0) > 0 && (
            <div className="card p-4">
              <h2 className="text-sm font-medium mb-2 text-ok">✅ Ustunliklaringiz</h2>
              <ul className="text-sm space-y-1 list-disc pl-4">
                {report.strengths?.map((s, i) => <li key={i}>{s}</li>)}
              </ul>
            </div>
          )}
          {(report.weaknesses?.length ?? 0) > 0 && (
            <div className="card p-4">
              <h2 className="text-sm font-medium mb-2 text-bad">⚠️ Kamchiliklaringiz</h2>
              <ul className="text-sm space-y-1 list-disc pl-4">
                {report.weaknesses?.map((s, i) => <li key={i}>{s}</li>)}
              </ul>
            </div>
          )}
        </div>

        {(report.topic_stats?.length ?? 0) > 0 && (
          <div className="card p-4">
            <h2 className="text-sm font-semibold mb-3">📊 Mavzular kesimida (aniq hisob)</h2>
            <div className="space-y-3">
              {report.topic_stats?.map((s, i) => {
                const okCount = s.total - s.wrong;
                const pct = s.total ? Math.round((okCount / s.total) * 100) : 0;
                return (
                  <div key={i}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="font-medium">{s.topic}</span>
                      <span className="text-mut tabular-nums">
                        {okCount}/{s.total} to&apos;g&apos;ri{s.avgScore !== null ? ` · o'rtacha ${s.avgScore}/100` : ""}
                      </span>
                    </div>
                    <div className="h-1.5 bg-panel2 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${pct >= 70 ? "bg-ok" : pct >= 40 ? "bg-warn" : "bg-bad"}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {(report.next_steps?.length ?? 0) > 0 && (
          <div className="card p-4">
            <h2 className="text-sm font-semibold mb-2">📌 Keyingi qadamlar</h2>
            <ul className="text-sm space-y-1.5 list-disc pl-4">
              {report.next_steps?.map((s, i) => <li key={i}>{s}</li>)}
            </ul>
          </div>
        )}

        {report.culture_note && <p className="text-xs text-mut px-1">{report.culture_note}</p>}

        <div className="flex flex-wrap gap-2">
          <button
            className="btn-primary"
            onClick={() => {
              localStorage.removeItem("ai_interview_session");
              setPhase("welcome");
              setWelcomeStep("name");
              setReport(null);
              setTrack(null);
              setName("");
            }}
          >
            🔁 Yangi intervyu
          </button>
          <Link href="/" className="btn-ghost">
            Asosiy sahifa
          </Link>
        </div>
      </main>
    );
  }

  if (!question) return <main className="min-h-screen flex items-center justify-center"><p className="text-mut">Yuklanmoqda...</p></main>;

  const isLast = question.index >= question.total;
  const gradingLabel = isLast
    ? `Yakuniy hisobot tuzilmoqda…${gradingSeconds > 3 ? ` ${gradingSeconds}s` : ""}`
    : question.type === "written"
      ? `AI baholayapti…${gradingSeconds > 3 ? ` ${gradingSeconds}s` : ""}`
      : "Yuborilmoqda…";

  return (
    <main className="min-h-screen p-4 md:p-8 max-w-2xl mx-auto">
      {/* Progress (TZ 5.3.2) */}
      <div className="mb-4">
        <div className="flex justify-between text-xs text-mut mb-1">
          <span>
            Savol {question.index} / {question.total}
            {track && <span className="ml-2 badge border-line text-mut">{getTrack(track).label}</span>}
          </span>
          <span>Daraja {level}/5 · {answered} javob berilgan</span>
        </div>
        <div className="h-2 bg-panel2 rounded-full overflow-hidden">
          <div className="h-full bg-acc transition-all" style={{ width: `${progress}%` }} />
        </div>
      </div>

      <div className="card p-5 space-y-4">
        <div className="flex items-center justify-between">
          <span className="badge border-line text-mut">{question.type === "mcq" ? "MCQ" : "Yozma"} · {question.difficulty}/5</span>
          <span className={`text-sm tabular-nums ${remaining <= 10 ? "text-bad font-semibold" : "text-mut"}`} role="timer">
            ⏱ {Math.floor(remaining / 60)}:{String(remaining % 60).padStart(2, "0")}
          </span>
        </div>

        <h2 className="text-lg font-medium whitespace-pre-wrap">{question.text}</h2>

        {feedback && (
          <div className={`rounded-md border px-3 py-2 text-sm ${feedback.isCorrect ? "border-ok/40 bg-ok/10 text-ok" : "border-warn/40 bg-warn/10 text-warn"}`}>
            {feedback.isCorrect ? "✅ To'g'ri" : "❌ Yetarli emas"}
            {feedback.aiScore !== null && ` — AI ball: ${feedback.aiScore}/100`}
          </div>
        )}

        {question.type === "mcq" ? (
          <div className="space-y-2" role="radiogroup" aria-label="Variantlar">
            {question.options.map((opt, i) => (
              <button
                key={i}
                type="button"
                role="radio"
                aria-checked={selected === i}
                onClick={() => setSelected(i)}
                className={`w-full text-left px-4 py-3 rounded-md border text-sm transition-colors ${
                  selected === i ? "border-acc bg-acc/15" : "border-line hover:bg-panel2"
                }`}
              >
                <b className="mr-2">{"ABCDE"[i]}.</b> {opt}
              </button>
            ))}
          </div>
        ) : (
          <div>
            <textarea
              className="w-full text-base leading-relaxed min-h-[220px] py-3"
              style={{ fontSize: "16px" }}
              rows={9}
              placeholder="Javobingizni shu yerga yozing... (kamida 15 belgi)"
              value={text}
              onChange={(e) => setText(e.target.value)}
              onPaste={() => setPasted(true)}
              maxLength={5000}
              autoFocus
              aria-label="Javobingiz"
            />
            <div className="flex justify-between text-xs text-mut mt-1.5">
              <span>
                {text.trim().length < 15 ? <span className="text-warn">Yana {(15 - text.trim().length)} belgi kerak</span> : <span className="text-ok">✓ Javob tayyor</span>}
                {pasted && <span className="text-warn ml-2">Paste ishlatilgan (loglandi)</span>}
                {tabSwitches > 0 && <span className="text-warn ml-2">Tab almashgan: {tabSwitches}</span>}
              </span>
              <span className="tabular-nums">{text.trim().length} / 5000</span>
            </div>
          </div>
        )}

        {error && <div className="rounded-md border border-bad/40 bg-bad/10 px-3 py-2 text-sm text-bad">{error}</div>}

        <div className="flex items-center justify-between pt-2 border-t border-line">
          <span className="text-xs text-mut hidden md:block">
            {question.type === "mcq" ? "1–5 raqamlar bilan tanlang" : "⌘/Ctrl+Enter bilan yuboring"}
          </span>
          <button className="btn-primary text-base px-6 py-2.5" disabled={!canSubmit || busy} onClick={() => submit(false)}>
            {busy ? gradingLabel : isLast ? "✓ Yakunlash" : "Keyingisi →"}
          </button>
        </div>
        {busy && !isLast && (
          <p className="text-xs text-mut text-center -mt-2">
            {question.type === "written"
              ? "AI javobingizni baholayapti — odatda 2–5 soniya. Baho chiqmasa ham sessiya davom etadi."
              : "Javob yuborilmoqda…"}
          </p>
        )}
      </div>
    </main>
  );
}
