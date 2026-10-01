"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { TRACKS, getTrack, stacksOf, getStack, type TrackSlug } from "@/lib/tracks";

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

type QStatus = "correct" | "wrong" | "skipped";

function statusOf(ev: { isCorrect: boolean; skipped?: boolean }): QStatus {
  return ev.skipped ? "skipped" : ev.isCorrect ? "correct" : "wrong";
}

export default function InterviewPage() {
  const [phase, setPhase] = useState<Phase>("welcome");
  const [welcomeStep, setWelcomeStep] = useState<"name" | "track" | "stack">("name");
  const [name, setName] = useState("");
  const [track, setTrack] = useState<TrackSlug | null>(null);
  const [stack, setStack] = useState<string | null>(null);
  const [stackCounts, setStackCounts] = useState<Record<string, number>>({});
  const [suggest, setSuggest] = useState("");
  const [suggestSent, setSuggestSent] = useState(false);
  const [pendingTrack, setPendingTrack] = useState<TrackSlug | null>(null);
  const [interviewId, setInterviewId] = useState<string | null>(null);
  const [question, setQuestion] = useState<Question | null>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const [text, setText] = useState("");
  const [remaining, setRemaining] = useState(0);
  const [busy, setBusy] = useState(false);
  const [gradingSeconds, setGradingSeconds] = useState(0);
  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState<{ isCorrect: boolean; aiScore: number | null; skipped?: boolean } | null>(null);
  const [report, setReport] = useState<Report | null>(null);
  const [level, setLevel] = useState(0);
  const [answered, setAnswered] = useState(0);
  // Savollar xaritasi: {index: status} — burchakdagi navigator + hisobot uchun
  const [history, setHistory] = useState<Record<number, QStatus>>({});
  const [totalQ, setTotalQ] = useState(12);
  const [pasted, setPasted] = useState(false);
  const [tabSwitches, setTabSwitches] = useState(0);
  const [paused, setPaused] = useState(false);
  const [pasteAttempts, setPasteAttempts] = useState(0);
  const [copyAttempts, setCopyAttempts] = useState(0);
  const [bulkBlocked, setBulkBlocked] = useState(false);
  const questionStart = useRef<number>(Date.now());
  const resumedRef = useRef(false);
  const autoFiredRef = useRef(false);
  const pauseStartRef = useRef<number>(0);
  const keyStrokesRef = useRef(0);
  const lastKeyRef = useRef(0);
  const prevTextRef = useRef("");

  // Draft: yozilgan matn/tanlov localStorage'da saqlanadi (refresh himoyasi)
  const draftKey = interviewId && question ? `draft:${interviewId}:${question.id}` : null;

  useEffect(() => {
    if (!draftKey) return;
    try {
      const raw = localStorage.getItem(draftKey);
      if (raw) {
        const d = JSON.parse(raw) as { text?: string; selected?: number | null };
        if (typeof d.text === "string") {
          setText(d.text);
          prevTextRef.current = d.text;
        }
        if (typeof d.selected === "number") setSelected(d.selected);
      } else {
        setText("");
        prevTextRef.current = "";
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

  // Xarita: bitta savol natijasini yozish + localStorage'da saqlash (refresh himoyasi)
  const saveStatus = useCallback(
    (idx: number, ev: { isCorrect: boolean; skipped?: boolean }) => {
      const st = statusOf(ev);
      setHistory((prev) => {
        const nx = { ...prev, [idx]: st };
        try {
          if (interviewId) localStorage.setItem(`history:${interviewId}`, JSON.stringify(nx));
        } catch {
          /* ignore */
        }
        return nx;
      });
    },
    [interviewId]
  );

  function loadLocalHistory(id: string): Record<number, QStatus> {
    try {
      const raw = localStorage.getItem(`history:${id}`);
      if (!raw) return {};
      const d = JSON.parse(raw) as Record<string, string>;
      const out: Record<number, QStatus> = {};
      for (const [k, v] of Object.entries(d)) {
        if (v === "correct" || v === "wrong" || v === "skipped") out[Number(k)] = v;
      }
      return out;
    } catch {
      return {};
    }
  }

  // 1-savolda "Orqaga (tillar)": sessiyani tozalab til tanlashga qaytish
  function backToStacks() {
    if (!interviewId || !question || busy || answered > 0) return;
    try {
      localStorage.removeItem("ai_interview_session");
      if (draftKey) localStorage.removeItem(draftKey);
      localStorage.removeItem(`history:${interviewId}`);
    } catch {
      /* ignore */
    }
    setInterviewId(null);
    setQuestion(null);
    setHistory({});
    setSelected(null);
    setText("");
    prevTextRef.current = "";
    setAnswered(0);
    setLevel(0);
    setFeedback(null);
    setError("");
    resetQuestionState();
    setPhase("welcome");
    setWelcomeStep("stack");
  }

  // Stack ro'yxati + savol sonlari (ommaviy API)
  useEffect(() => {
    if (phase !== "welcome" || welcomeStep !== "stack") return;
    fetch("/api/stacks")
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        if (!j?.stacks) return;
        const m: Record<string, number> = {};
        for (const s of j.stacks as { slug: string; count: number }[]) m[s.slug] = s.count;
        setStackCounts(m);
      })
      .catch(() => {});
  }, [phase, welcomeStep]);

  async function sendSuggestion() {
    const t = suggest.trim().slice(0, 60);
    if (t.length < 2) return;
    try {
      await fetch("/api/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: `/stack-taklif: ${t}`, kind: "view" })
      });
    } catch {
      /* ignore */
    }
    setSuggestSent(true);
    setSuggest("");
    setTimeout(() => setSuggestSent(false), 3000);
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
        if (j.stack) setStack(j.stack as string);
        if (typeof j.total === "number") setTotalQ(j.total);
        // Xarita tarixini tiklash: server > localStorage
        const serverHist: Record<number, QStatus> = {};
        if (Array.isArray(j.answers)) {
          for (const a of j.answers as { index: number; isCorrect: boolean | null; skipped: boolean }[]) {
            serverHist[a.index] = a.skipped ? "skipped" : a.isCorrect ? "correct" : "wrong";
          }
        }
        const merged = { ...loadLocalHistory(saved), ...serverHist };
        if (Object.keys(merged).length > 0) setHistory(merged);
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

  function resetQuestionState() {
    autoFiredRef.current = false;
    setPaused(false);
    setPasted(false);
    setPasteAttempts(0);
    setCopyAttempts(0);
    setBulkBlocked(false);
    keyStrokesRef.current = 0;
    prevTextRef.current = "";
  }

  function togglePause() {
    if (phase !== "question" || !question || busy) return;
    if (!paused) {
      setPaused(true);
      pauseStartRef.current = Date.now();
    } else {
      // Pauza davomiyligini questionStart'ga qo'shamiz — vaqt to'xtaydi, timeSpent to'g'ri hisoblanadi
      questionStart.current += Date.now() - pauseStartRef.current;
      setPaused(false);
    }
  }

  // === Anti-cheat: faqat qo'lda yozish (paste/copy/drop blok, 95%+ himoya) ===
  function handleTextareaKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    lastKeyRef.current = Date.now();
    keyStrokesRef.current += 1;
    if ((e.ctrlKey || e.metaKey) && ["v", "c", "x"].includes(e.key.toLowerCase())) {
      e.preventDefault();
      if (e.key.toLowerCase() === "v") {
        setPasted(true);
        setPasteAttempts((n) => n + 1);
      } else {
        setCopyAttempts((n) => n + 1);
      }
    }
  }

  function handleTextChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const next = e.target.value;
    // 5000 chegaradan ortig'i — kesib olish (server ham kesadi)
    const capped = next.length > 5000 ? next.slice(0, 5000) : next;
    const prev = prevTextRef.current;
    const delta = capped.length - prev.length;
    const now = Date.now();
    // Bir anda 6+ belgi ko'payishi + oxirgi klavishdan 800ms o'tgan bo'lsa = paste/devtools/drop urinish
    if (delta > 6 && now - lastKeyRef.current > 800 && prev.length > 0) {
      setPasted(true);
      setPasteAttempts((n) => n + 1);
      setBulkBlocked(true);
      setTimeout(() => setBulkBlocked(false), 2500);
      return; // qiymatni qabul qilmaymiz — faqat yozishga ruxsat
    }
    // Birinchi yuklanishda (draft) katta matn bo'lsa ruxsat beramiz
    if (delta > 6 && prev.length === 0 && capped.length > 0) {
      prevTextRef.current = capped;
      setText(capped);
      return;
    }
    prevTextRef.current = capped;
    setBulkBlocked(false);
    setText(capped);
  }

  const submit = useCallback(
    async (auto: boolean, forceSkip = false) => {
      if (!interviewId || !question || busy) return;
      if (paused && !forceSkip) return;
      const shouldSkip =
        forceSkip || (auto && (question.type === "mcq" ? selected === null : text.trim().length < 15));
      if (!auto && !forceSkip) {
        if (question.type === "mcq" && selected === null) return;
        if (question.type === "written" && text.trim().length < 15) return;
      }
      // Pauzada avtomatik yuborish bo'lmasligi kerak
      if (auto && paused) return;
      setBusy(true);
      setError("");
      try {
        const res = await fetch("/api/interview/answer", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            interviewId,
            questionId: question.id,
            selectedIndex: shouldSkip ? null : question.type === "mcq" ? selected : null,
            answerText: question.type === "written" ? text : null,
            skipped: shouldSkip,
            timeSpent: Math.floor((Date.now() - questionStart.current) / 1000),
            tabSwitches,
            pasted: pasted || pasteAttempts > 0,
            pasteAttempts,
            copyAttempts,
            keyStrokes: keyStrokesRef.current
          })
        });
        const j = await res.json();
        if (!res.ok) {
          // Timeout'da 422 kelmasligi kerak (skipped yuboriladi), lekin kelib qolsa — skipga aylantiramiz
          if (auto && (res.status === 422 || j.error?.includes("belgi") || j.error?.includes("bo'sh"))) {
            autoFiredRef.current = true;
            setError("");
            // Bir marta skip sifatida qayta urinamiz
            try {
              const r2 = await fetch("/api/interview/answer", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  interviewId,
                  questionId: question.id,
                  selectedIndex: null,
                  answerText: text || "[vaqt tugadi]",
                  skipped: true,
                  timeSpent: question.timeLimit,
                  tabSwitches,
                  pasted: pasted || pasteAttempts > 0,
                  pasteAttempts,
                  copyAttempts,
                  keyStrokes: keyStrokesRef.current
                })
              });
              const j2 = await r2.json();
              if (!r2.ok) {
                setError(j2.error || "Xatolik");
                autoFiredRef.current = false;
                return;
              }
              setFeedback(j2.evaluated);
              saveStatus(question.index, j2.evaluated);
              setPasted(false);
              setTabSwitches(0);
              clearDraft();
              setSelected(null);
              setText("");
              prevTextRef.current = "";
              if (j2.next) {
                setQuestion(j2.next);
                setRemaining(j2.next.timeLimit);
                questionStart.current = Date.now();
                resetQuestionState();
                if (j2.evaluated) setAnswered((n) => n + 1);
                setTimeout(() => setFeedback(null), 2200);
              } else {
                setQuestion(null);
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
              return;
            } catch {
              setError("Serverga ulanib bo'lmadi");
              autoFiredRef.current = false;
              return;
            }
          }
          setError(j.error || "Xatolik");
          autoFiredRef.current = false;
          return;
        }
        setFeedback(j.evaluated);
        saveStatus(question.index, j.evaluated);
        setPasted(false);
        setTabSwitches(0);
        clearDraft();
        setSelected(null);
        setText("");
        prevTextRef.current = "";
        if (j.next) {
          setQuestion(j.next);
          setRemaining(j.next.timeLimit);
          questionStart.current = Date.now();
          resetQuestionState();
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
    [interviewId, question, busy, selected, text, tabSwitches, pasted, pasteAttempts, copyAttempts, paused, saveStatus]
  );

  // Timer: 0 bo'lsa avtomatik yuborish/o'tkazish — xatoliksiz (pauzada to'xtaydi)
  useEffect(() => {
    if (phase !== "question" || !question || paused) return;
    if (remaining <= 0) {
      if (!autoFiredRef.current) {
        autoFiredRef.current = true;
        submit(true);
      }
      return;
    }
    const t = setTimeout(() => setRemaining((r) => r - 1), 1000);
    return () => clearTimeout(t);
  }, [phase, question, remaining, submit, paused]);

  // Klaviatura: 1-5 variant, ⌘/Ctrl+Enter yuborish (TZ 5.3.2) — pauzada ishlamaydi
  useEffect(() => {
    if (phase !== "question" || !question || paused) return;
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
  }, [phase, question, submit, paused]);

  async function start(stackSlug: string) {
    if (name.trim().length < 2) {
      setWelcomeStep("name");
      return;
    }
    const st = getStack(stackSlug);
    const trackSlug = (st?.track ?? track ?? "frontend") as TrackSlug;
    setPendingTrack(trackSlug);
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/interview/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), track: trackSlug, stack: stackSlug })
      });
      let j: {
        error?: string;
        interviewId: string;
        track?: TrackSlug;
        stack?: string | null;
        question: NonNullable<typeof question>;
      };
      try {
        j = await res.json();
      } catch {
        setError(res.ok ? "Serverdan noto'g'ri javob keldi" : `Server xatosi (${res.status})`);
        return;
      }
      if (!res.ok) {
        setError(j.error || "Xatolik");
        return;
      }
      localStorage.setItem("ai_interview_session", j.interviewId);
      setInterviewId(j.interviewId);
      setTrack(j.track ?? trackSlug);
      setStack(j.stack ?? stackSlug);
      setQuestion(j.question);
      setRemaining(j.question.timeLimit);
      setAnswered(0);
      setLevel(0);
      setHistory({});
      setTotalQ(j.question.total);
      setText("");
      setSelected(null);
      setFeedback(null);
      resetQuestionState();
      questionStart.current = Date.now();
      setPhase("question");
    } catch {
      setError("Serverga ulanib bo'lmadi. Qayta urinib ko'ring.");
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
                ? "12 savol · adaptiv qiyinlik · AI baholash · o'tkazish va pauza mumkin"
                : welcomeStep === "track"
                  ? "Qaysi yo'nalishda ishlaysiz?"
                  : "Qaysi tilda savollar berilsin?"}
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
              <p className="text-xs text-mut text-center">Savolga kirgach vaqt hisoblanadi — pauza bossangiz vaqt to&apos;xtaydi, maydon bloklanadi. Vaqt tugasa savol avtomatik o&apos;tkaziladi (xatoliksiz).</p>
            </form>
          ) : welcomeStep === "track" ? (
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
                  onClick={() => {
                    setTrack(t.slug);
                    setWelcomeStep("stack");
                  }}
                  disabled={busy}
                  className="w-full text-left card p-4 hover:border-acc transition-colors disabled:opacity-60"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl" aria-hidden>{t.icon}</span>
                    <div className="flex-1">
                      <div className="font-semibold">{t.label}</div>
                      <div className="text-xs text-mut mt-0.5">{t.description}</div>
                    </div>
                    <span className="text-acc text-sm">Tanlash →</span>
                  </div>
                </button>
              ))}
              <p className="text-xs text-mut text-center">
                Keyingi qadamda aynan qaysi dasturlash tilida savollar berilishini tanlaysiz.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-mut">
                <span>👤 {name.trim()} · {track ? getTrack(track)?.label ?? track : ""}</span>
                <button type="button" className="hover:text-acc" onClick={() => setWelcomeStep("track")}>
                  ← yo&apos;nalish
                </button>
              </div>
              {stacksOf(track).map((s) => (
                <button
                  key={s.slug}
                  type="button"
                  onClick={() => start(s.slug)}
                  disabled={busy}
                  className="w-full text-left card p-4 hover:border-acc transition-colors disabled:opacity-60"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl" aria-hidden>{s.icon}</span>
                    <div className="flex-1">
                      <div className="font-semibold">
                        {s.label}
                        {stackCounts[s.slug] !== undefined && (
                          <span className="ml-2 text-xs font-normal text-mut">· {stackCounts[s.slug]} savol</span>
                        )}
                      </div>
                      <div className="text-xs text-mut mt-0.5">{s.description}</div>
                    </div>
                    <span className="text-acc text-sm">
                      {pendingTrack === s.track && busy ? "Boshlanmoqda..." : "Boshlash →"}
                    </span>
                  </div>
                </button>
              ))}
              <div className="rounded-md border border-line p-3 space-y-2">
                <p className="text-xs text-mut">🔎 Kerakli til yo&apos;qmi? Yozing — ko&apos;p so&apos;ralsa keyingi bo&apos;lib qo&apos;shamiz:</p>
                {suggestSent ? (
                  <p className="text-xs text-ok">✓ Qabul qilindi, rahmat!</p>
                ) : (
                  <form
                    className="flex gap-2"
                    onSubmit={(e) => {
                      e.preventDefault();
                      sendSuggestion();
                    }}
                  >
                    <input
                      className="flex-1 text-sm py-2"
                      placeholder="Masalan: PHP, C#, Rust..."
                      value={suggest}
                      onChange={(e) => setSuggest(e.target.value)}
                      maxLength={60}
                    />
                    <button type="submit" className="text-sm border border-line rounded-md px-3 hover:border-acc" disabled={suggest.trim().length < 2}>
                      Yuborish
                    </button>
                  </form>
                )}
              </div>
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
    // Tugatgach e'lon: to'g'ri/xato/o'tkazildi hisobi
    const histVals = Object.values(history);
    const doneC = histVals.filter((v) => v === "correct").length;
    const doneW = histVals.filter((v) => v === "wrong").length;
    const doneS = histVals.filter((v) => v === "skipped").length;
    return (
      <main className="min-h-screen p-4 md:p-8 max-w-2xl mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold">Intervyu yakuni</h1>
          {stack && getStack(stack) ? (
            <span className="badge border-acc/40 text-acc">{getStack(stack)?.label}</span>
          ) : (
            track && <span className="badge border-acc/40 text-acc">{getTrack(track)?.label ?? track}</span>
          )}
        </div>

        {histVals.length > 0 && (
          <div className="card p-4">
            <p className="text-sm font-medium">
              🎉 Tugatdingiz! <span className="text-ok">{doneC} to'g'ri</span>
              {" · "}
              <span className="text-bad">{doneW} xato</span>
              {" · "}
              <span className="text-warn">{doneS} o'tkazildi</span>
            </p>
            <div className="flex flex-wrap gap-1 mt-2" aria-label="Savollar xaritasi">
              {Array.from({ length: Math.max(totalQ, ...Object.keys(history).map(Number)) }, (_, i) => {
                const n = i + 1;
                const st = history[n];
                const cls =
                  st === "correct"
                    ? "bg-ok/20 border-ok/60 text-ok"
                    : st === "wrong"
                      ? "bg-bad/20 border-bad/60 text-bad"
                      : st === "skipped"
                        ? "bg-warn/20 border-warn/60 text-warn"
                        : "border-line text-mut";
                return (
                  <span
                    key={n}
                    title={`${n}-savol${st === "correct" ? ": to'g'ri" : st === "wrong" ? ": xato" : st === "skipped" ? ": o'tkazildi" : ""}`}
                    className={`w-7 h-7 text-xs tabular-nums flex items-center justify-center rounded-md border ${cls}`}
                  >
                    {n}
                  </span>
                );
              })}
            </div>
          </div>
        )}

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
              try {
                if (interviewId) localStorage.removeItem(`history:${interviewId}`);
              } catch {
                /* ignore */
              }
              setPhase("welcome");
              setWelcomeStep("name");
              setReport(null);
              setHistory({});
              setTrack(null);
              setStack(null);
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
      {/* Savollar xaritasi — ekran burchagida: yashil=to'g'ri, qizil=xato, sariq=o'tkazildi */}
      <nav aria-label="Savollar xaritasi" className="fixed bottom-4 right-4 z-30 card p-2 w-[148px] shadow-lg">
        <div className="text-[10px] text-mut px-1 pb-1.5 flex justify-between tabular-nums">
          <span>Savollar</span>
          <span>{answered}/{question.total}</span>
        </div>
        <div className="flex flex-wrap gap-1">
          {Array.from({ length: question.total }, (_, i) => {
            const n = i + 1;
            const st = history[n];
            const isCur = n === question.index;
            const cls =
              st === "correct"
                ? "bg-ok/20 border-ok/60 text-ok"
                : st === "wrong"
                  ? "bg-bad/20 border-bad/60 text-bad"
                  : st === "skipped"
                    ? "bg-warn/20 border-warn/60 text-warn"
                    : isCur
                      ? "border-acc text-acc"
                      : "border-line text-mut";
            const title =
              st === "correct"
                ? `${n}-savol: to'g'ri`
                : st === "wrong"
                  ? `${n}-savol: xato`
                  : st === "skipped"
                    ? `${n}-savol: o'tkazildi`
                    : isCur
                      ? `${n}-savol: hozirgi`
                      : `${n}-savol`;
            return (
              <span
                key={n}
                title={title}
                className={`w-7 h-7 text-xs tabular-nums flex items-center justify-center rounded-md border ${cls} ${isCur ? "ring-1 ring-acc" : ""}`}
              >
                {n}
              </span>
            );
          })}
        </div>
        <div className="flex gap-2 px-1 pt-1.5 text-[9px] text-mut">
          <span className="flex items-center gap-1"><i className="w-2 h-2 rounded-sm bg-ok inline-block" />to'g'ri</span>
          <span className="flex items-center gap-1"><i className="w-2 h-2 rounded-sm bg-bad inline-block" />xato</span>
          <span className="flex items-center gap-1"><i className="w-2 h-2 rounded-sm bg-warn inline-block" />o'tkazildi</span>
        </div>
      </nav>
      {/* Progress (TZ 5.3.2) */}
      <div className="mb-4">
        <div className="flex justify-between text-xs text-mut mb-1">
          <span>
            Savol {question.index} / {question.total}
            {stack && getStack(stack) ? (
              <span className="ml-2 badge border-line text-mut">{getStack(stack)?.label}</span>
            ) : (
              track && <span className="ml-2 badge border-line text-mut">{getTrack(track)?.label ?? track}</span>
            )}
          </span>
          <span>Daraja {level}/5 · {answered} javob berilgan</span>
        </div>
        <div className="h-2 bg-panel2 rounded-full overflow-hidden">
          <div className="h-full bg-acc transition-all" style={{ width: `${progress}%` }} />
        </div>
      </div>

      <div
        className="card p-5 space-y-4"
        onCopy={(e) => {
          // Savol matnini ko'chirib olishni qiyinlashtirish (anti-cheat)
          const t = window.getSelection()?.toString() ?? "";
          if (t.length > 20) {
            setCopyAttempts((n) => n + 1);
          }
        }}
      >
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <span className="badge border-line text-mut">{question.type === "mcq" ? "MCQ" : "Yozma"} · {question.difficulty}/5</span>
          <div className="flex items-center gap-2">
            <span className={`text-sm tabular-nums ${remaining <= 10 ? "text-bad font-semibold" : "text-mut"}`} role="timer">
              ⏱ {Math.floor(remaining / 60)}:{String(remaining % 60).padStart(2, "0")}
              {paused && <span className="ml-1 text-warn font-semibold">(to'xtatilgan)</span>}
            </span>
            <button
              type="button"
              onClick={togglePause}
              disabled={busy}
              className="text-xs border border-line rounded-md px-2.5 py-1.5 hover:border-acc disabled:opacity-50"
              title={paused ? "Davom etish — vaqt yuradi, maydon ochiladi" : "Pauza — vaqt to'xtaydi, maydon bloklanadi"}
            >
              {paused ? "▶ Davom etish" : "⏸ Pauza"}
            </button>
          </div>
        </div>

        <h2 className="text-lg font-medium whitespace-pre-wrap select-none" onCopy={(e) => e.preventDefault()}>
          {question.text}
        </h2>

        {paused && (
          <div className="rounded-md border border-warn/40 bg-warn/10 px-3 py-2 text-sm text-warn">
            ⏸ Pauza yoqilgan — vaqt to&apos;xtadi, javob maydoni bloklandi. Davom etish uchun &ldquo;▶ Davom etish&rdquo; ni bosing.
          </div>
        )}

        {feedback && (
          <div className={`rounded-md border px-3 py-2 text-sm ${feedback.skipped ? "border-line bg-panel2 text-mut" : feedback.isCorrect ? "border-ok/40 bg-ok/10 text-ok" : "border-warn/40 bg-warn/10 text-warn"}`}>
            {feedback.skipped ? "⏭ O'tkazib yuborildi (0 ball)" : feedback.isCorrect ? "✅ To'g'ri" : "❌ Yetarli emas"}
            {!feedback.skipped && feedback.aiScore !== null && ` — AI ball: ${feedback.aiScore}/100`}
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
                disabled={paused || busy}
                onClick={() => setSelected(i)}
                className={`w-full text-left px-4 py-3 rounded-md border text-sm transition-colors disabled:opacity-60 ${
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
              className="w-full text-base leading-relaxed min-h-[220px] py-3 disabled:opacity-60"
              style={{ fontSize: "16px" }}
              rows={9}
              placeholder={paused ? "Pauzada yozish bloklangan — davom eting..." : "Javobingizni shu yerga FAQAT QO'LDA yozing... (kamida 15 belgi, ko'chirib joylash bloklangan)"}
              value={text}
              onChange={handleTextChange}
              onKeyDown={handleTextareaKeyDown}
              onPaste={(e) => {
                e.preventDefault();
                setPasted(true);
                setPasteAttempts((n) => n + 1);
              }}
              onCopy={(e) => {
                e.preventDefault();
                setCopyAttempts((n) => n + 1);
              }}
              onCut={(e) => {
                e.preventDefault();
                setCopyAttempts((n) => n + 1);
              }}
              onDrop={(e) => {
                e.preventDefault();
                setPasted(true);
                setPasteAttempts((n) => n + 1);
              }}
              onDragOver={(e) => e.preventDefault()}
              onContextMenu={(e) => e.preventDefault()}
              maxLength={5000}
              autoFocus={!paused}
              disabled={paused || busy}
              aria-label="Javobingiz"
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck={false}
            />
            <div className="flex justify-between text-xs text-mut mt-1.5 flex-wrap gap-1">
              <span>
                {text.trim().length < 15 ? <span className="text-warn">Yana {(15 - text.trim().length)} belgi kerak</span> : <span className="text-ok">✓ Javob tayyor</span>}
                {(pasted || pasteAttempts > 0) && <span className="text-warn ml-2">⛔ Ko&apos;chirib joylash bloklangan ({pasteAttempts} urinish, loglandi)</span>}
                {bulkBlocked && <span className="text-bad ml-2">Faqat qo&apos;lda yozing — ommaviy joylash rad etildi!</span>}
                {copyAttempts > 0 && <span className="text-warn ml-2">Nusxa urinish: {copyAttempts}</span>}
                {tabSwitches > 0 && <span className="text-warn ml-2">Tab almashgan: {tabSwitches}</span>}
              </span>
              <span className="tabular-nums">{text.trim().length} / 5000</span>
            </div>
            <p className="text-[11px] text-mut mt-1">🛡 Himoya: paste / drop / Ctrl+V / o&apos;ng klik / devtools orqali ommaviy joylash bloklangan. Faqat klaviatura bilan yozish mumkin.</p>
          </div>
        )}

        {error && <div className="rounded-md border border-bad/40 bg-bad/10 px-3 py-2 text-sm text-bad">{error}</div>}

        <div className="flex items-center justify-between pt-2 border-t border-line gap-2 flex-wrap">
          <span className="text-xs text-mut hidden md:block">
            {question.type === "mcq" ? "1–5 raqamlar bilan tanlang" : "⌘/Ctrl+Enter bilan yuboring"}
          </span>
          <div className="flex gap-2 ml-auto">
            {question.index === 1 && (
              <button
                type="button"
                className="text-base px-4 py-2.5 border border-line rounded-md hover:border-acc disabled:opacity-50"
                disabled={busy || paused || answered > 0}
                onClick={backToStacks}
                title="Til tanlashga qaytish"
              >
                ← Tillar
              </button>
            )}
            <button
              type="button"
              className="text-base px-4 py-2.5 border border-line rounded-md hover:border-warn disabled:opacity-50"
              disabled={busy || paused}
              onClick={() => submit(false, true)}
              title="Javobsiz keyingi savolga o'tish (0 ball)"
            >
              ⏭ O&apos;tkazish
            </button>
            <button className="btn-primary text-base px-6 py-2.5 disabled:opacity-50" disabled={!canSubmit || busy || paused} onClick={() => submit(false)}>
              {busy ? gradingLabel : isLast ? "✓ Yakunlash" : "Keyingisi →"}
            </button>
          </div>
        </div>
        {remaining <= 15 && !paused && (
          <p className="text-xs text-warn text-center">⏳ Vaqt tugasa savol avtomatik o&apos;tkaziladi — xatolik bermaydi.</p>
        )}
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
