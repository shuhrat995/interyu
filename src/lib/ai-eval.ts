import { prisma } from "@/lib/prisma";
import { callAI, type AIProvider } from "@/lib/ai-provider";

export type WrittenEvaluation = {
  score: number; // 0-100
  verdict: "kuchli" | "o'rtacha" | "zaif";
  strengths: string[];
  gaps: string[];
  misconceptions: string[];
  interviewer_note: string;
  followup: string | null;
};

export type Severity = "yuqori" | "o'rta" | "past";

export type CriticalIssue = {
  issue: string;
  evidence: string;
  severity: Severity;
};

export type FocusArea = {
  topic: string;
  priority: number;
  why: string;
  how: string;
};

export type TopicStat = {
  topic: string;
  total: number;
  wrong: number;
  avgScore: number | null;
};

export type FinalReport = {
  level: string;
  overall_score: number;
  summary: string;
  strengths: string[];
  weaknesses: string[];
  /** Ochiq aytilgan jiddiy muammolar (asoslari bilan) */
  critical_issues: CriticalIssue[];
  /** Nimaga aniq focus qaratish kerak — ustuvorlik tartibida */
  focus_areas: FocusArea[];
  topics_to_improve: FocusArea[];
  /** Mavzular kesimidagi xom statistika (har doim lokal hisoblanadi) */
  topic_stats: TopicStat[];
  hiring_recommendation: "ha" | "yo'q" | "shartli";
  culture_note: string;
  next_steps: string[];
};

export type TranscriptItem = {
  question: string;
  answer: string;
  isCorrect: boolean | null;
  aiScore: number | null;
  topic: string;
  topicSlug: string;
  difficulty: number;
};

/** Savol turi bo'yicha aniq o'sish yo'nalishlari (focus uchun) */
const TOPIC_ADVICE: Record<string, string> = {
  html: "Semantik teglar (header/nav/main/article), accessibility (ARIA, alt) va formalarni qayta ko'rib chiqing.",
  css: "Flexbox/Grid, specificity va cascade, responsive birliklar (rem/clamp) va zamonaviy selektorlarni mashq qiling.",
  javascript: "Closure, event loop, this konteksti, Promise/async-await va prototip zanjirini amaliy misollarda mustahkamlang.",
  typescript: "Generics, union/intersection, type narrowing va utility type'larni real kodda qo'llang.",
  react: "Hookslar qoidalari (useEffect bog'liqliklari), state batching, render optimizatsiyasi (memo/useMemo) va reconciliation'ni o'rganing.",
  api: "HTTP metod/status kodlar, REST resurs dizayni, autentifikatsiya (JWT/sessiya) va idempotentlikni takrorlang.",
  database: "Indekslar, normalizatsiya, JOIN turlari, transaksiya va N+1 muammosini amaliyot bilan mustahkamlang.",
  algorithms: "Big-O baholash, massiv/string algoritmlari va asosiy ma'lumot tuzilmalarini (stack, queue, map, set) mashq qiling."
};

const ADVICE_FALLBACK = "Shu mavzuning asosiy tushunchalarini qisqa konspekt qilib, keyin amaliy loyihada qo'llang.";

async function activePrompt(kind: string): Promise<string | null> {
  const p = await prisma.promptVersion.findFirst({ where: { kind, isActive: true }, orderBy: { version: "desc" } });
  return p?.template ?? null;
}

function fill(template: string, vars: Record<string, string>): string {
  return Object.entries(vars).reduce((acc, [k, v]) => acc.replaceAll(`{{${k}}}`, v), template);
}

/** Promptni keraksiz uzun matn bilan shishirmaslik — AI javob tezligi shunga bog'liq */
function clip(text: string, max: number): string {
  const t = text.trim();
  return t.length <= max ? t : `${t.slice(0, max)}…`;
}

function verdictOf(score: number): WrittenEvaluation["verdict"] {
  if (score >= 70) return "kuchli";
  if (score >= 40) return "o'rtacha";
  return "zaif";
}

/** Rubric va kalit so'zlar asosida deterministik fallback baho */
export function mockEvaluate(text: string, rubric: string, keywords: string[], difficulty: number): WrittenEvaluation {
  const words = text.trim().split(/\s+/).length;
  const lower = text.toLowerCase();
  const hits = keywords.filter((k) => lower.includes(k.toLowerCase()));
  const coverage = keywords.length ? hits.length / keywords.length : 0.5;
  const lenBonus = Math.min(1, words / (40 + difficulty * 20));
  const score = Math.round(Math.min(100, coverage * 60 + lenBonus * 40));
  const missed = keywords.filter((k) => !hits.includes(k));
  return {
    score,
    verdict: verdictOf(score),
    strengths: hits.length ? `Shu tushunchalarni to'g'ri yoritgan: ${hits.slice(0, 4).join(", ")}`.split(" | ") : ["Javob berilgan"],
    gaps: missed.length ? `Yetishmaydi: ${missed.slice(0, 4).join(", ")}`.split(" | ") : [],
    misconceptions: [],
    interviewer_note:
      score >= 70
        ? "Javob rubric talablarining katta qismini qamrab olgan, davom etish mumkin."
        : score >= 40
          ? "Javob qisman to'g'ri, ayrim tushunchalar yetishmaydi — aniqlashtiruvchi savol berish kerak."
          : "Javob sirtqi, chuqur tushuncha sezilmayapti.",
    followup: missed.length ? `${missed[0]} haqida batafsil gapirib bering` : null
  };
}

/**
 * Yozma javobni baholash. AI 9 soniyalik byudjet ichida javob bermasa —
 * heuristik baho ishlatiladi, shunda nomzod kutib qolmaydi.
 */
export async function evaluateWritten(args: {
  question: string;
  answer: string;
  rubric: string;
  keywords: string[];
  difficulty: number;
  topic?: string;
}): Promise<{ evaluation: WrittenEvaluation; provider: AIProvider }> {
  const tpl = await activePrompt("evaluate_written");
  if (tpl) {
    const prompt = fill(tpl, {
      question: clip(args.question, 600),
      answer: clip(args.answer, 1600),
      rubric: clip(args.rubric, 900),
      keywords: args.keywords.slice(0, 12).join(", "),
      topic: args.topic ?? "",
      difficulty: String(args.difficulty)
    });
    const res = await callAI("evaluate_written", prompt, { budgetMs: 9000, maxOutputTokens: 500 });
    if (res.ok && typeof res.data.score === "number") {
      const score = Math.max(0, Math.min(100, Math.round(res.data.score)));
      return {
        provider: res.provider,
        evaluation: {
          score,
          verdict: verdictOf(score),
          strengths: Array.isArray(res.data.strengths) ? (res.data.strengths as string[]) : [],
          gaps: Array.isArray(res.data.gaps) ? (res.data.gaps as string[]) : [],
          misconceptions: Array.isArray(res.data.misconceptions) ? (res.data.misconceptions as string[]) : [],
          interviewer_note: typeof res.data.interviewer_note === "string" ? res.data.interviewer_note : "",
          followup: typeof res.data.followup === "string" ? res.data.followup : null
        }
      };
    }
  }
  return { provider: "mock", evaluation: mockEvaluate(args.answer, args.rubric, args.keywords, args.difficulty) };
}

/** Mavzu kesimida xato/ball statistikasi — AI javobiga bog'liq bo'lmagan ishonchli qism */
export function topicStats(transcript: TranscriptItem[]): TopicStat[] {
  const map = new Map<string, { total: number; wrong: number; scores: number[] }>();
  for (const t of transcript) {
    const row = map.get(t.topic) ?? { total: 0, wrong: 0, scores: [] };
    row.total += 1;
    if (t.isCorrect === false || (t.aiScore !== null && t.aiScore < 40)) row.wrong += 1;
    if (t.aiScore !== null) row.scores.push(t.aiScore);
    map.set(t.topic, row);
  }
  return Array.from(map.entries())
    .map(([topic, r]) => ({
      topic,
      total: r.total,
      wrong: r.wrong,
      avgScore: r.scores.length ? Math.round(r.scores.reduce((s, x) => s + x, 0) / r.scores.length) : null
    }))
    .sort((a, b) => b.wrong - a.wrong || b.total - a.total);
}

export function scoreOf(transcript: TranscriptItem[]): number {
  const scored = transcript.filter((t) => t.aiScore !== null) as { aiScore: number }[];
  const mcq = transcript.filter((t) => t.isCorrect !== null);
  const avgAi = scored.length ? scored.reduce((s, t) => s + t.aiScore, 0) / scored.length : null;
  const mcqAcc = mcq.length ? (mcq.filter((t) => t.isCorrect === true).length / mcq.length) * 100 : null;
  if (avgAi !== null && mcqAcc !== null) return Math.round(avgAi * 0.7 + mcqAcc * 0.3);
  return Math.round(avgAi ?? mcqAcc ?? 0);
}

export function levelOf(score: number): string {
  return score >= 85 ? "senior" : score >= 70 ? "middle+" : score >= 55 ? "middle" : score >= 35 ? "junior+" : "junior";
}

/**
 * Lokal (AI'siz) tahlil — ochiq, asoslangan va har doim mavjud.
 * AI ishlamay qolsa ham nomzod to'liq, halol hisobot oladi.
 */
export function analyzeTranscript(
  transcript: TranscriptItem[],
  antiCheat: { tabSwitches: number; pasted: boolean }[] = []
): {
  overall_score: number;
  level: string;
  strengths: string[];
  weaknesses: string[];
  critical_issues: CriticalIssue[];
  focus_areas: FocusArea[];
  topic_stats: TopicStat[];
} {
  const stats = topicStats(transcript);
  const overall = scoreOf(transcript);
  const level = levelOf(overall);

  const strongTopics = stats.filter((s) => s.wrong === 0 && s.total >= 2);
  const highAvg = stats.filter((s) => s.avgScore !== null && s.avgScore >= 70);
  const strengths: string[] = [];
  for (const s of highAvg.slice(0, 3)) strengths.push(`${s.topic}: o'rtacha ball ${s.avgScore}/100 (${s.total} savol)`);
  for (const s of strongTopics.filter((x) => !highAvg.includes(x)).slice(0, 2)) {
    strengths.push(`${s.topic}: ${s.total} savolda xato yo'q`);
  }
  if (strengths.length === 0) {
    strengths.push(
      transcript.length > 0 ? "Intervyuni oxirigacha yetkazdingiz — bu o'zi intizom ko'rsatkichi" : "Natija yo'q"
    );
  }

  const weakTopics = stats.filter((s) => s.wrong > 0);
  const weaknesses: string[] = weakTopics.slice(0, 4).map((s) => {
    const avg = s.avgScore !== null ? `, o'rtacha ball ${s.avgScore}/100` : "";
    return `${s.topic}: ${s.total} savoldan ${s.wrong} tasida xato/tub javob${avg}`;
  });
  if (weaknesses.length === 0 && transcript.length > 0) weaknesses.push("Barcha mavzularda xatosiz javob berdingiz — zaif nuqta topilmadi");

  // Ochiq, asoslangan tanqid
  const critical_issues: CriticalIssue[] = [];
  for (const s of stats.filter((s) => s.total >= 2 && s.wrong / s.total >= 0.5)) {
    critical_issues.push({
      issue: `"${s.topic}" mavzusi bo'yicha bilim yetarli emas — javoblar yuzaki, amaliy tushuncha ko'rinmaydi`,
      evidence: `${s.total} savoldan ${s.wrong} tasi xato yoki juda past baho${s.avgScore !== null ? ` (o'rtacha ${s.avgScore}/100)` : ""}`,
      severity: "yuqori"
    });
  }
  const lowScores = transcript.filter((t) => t.aiScore !== null && t.aiScore < 30);
  if (lowScores.length >= 2) {
    critical_issues.push({
      issue: "Javoblar juda qisqa va umumiy — atamalar chalkash, sabab-natija izohlanmagan",
      evidence: `${lowScores.length} javob AI tomonidan 30 balldan past deb baholandi (masalan: "${clip(lowScores[0].question, 60)}")`,
      severity: "yuqori"
    });
  }
  for (const s of stats.filter((s) => s.wrong > 0 && !(s.total >= 2 && s.wrong / s.total >= 0.5)).slice(0, 3)) {
    critical_issues.push({
      issue: `"${s.topic}" mavzusida bo'shliqlar bor — javobda asosiy tushunchalar tushib qolgan`,
      evidence: `${s.total} savoldan ${s.wrong} tasida xato${s.avgScore !== null ? `, o'rtacha ball ${s.avgScore}/100` : ""}`,
      severity: s.wrong / s.total >= 0.34 ? "o'rta" : "past"
    });
  }
  const cheats = antiCheat.filter((a) => a.tabSwitches > 0 || a.pasted);
  if (cheats.length > 0) {
    const tabTotal = cheats.reduce((s, c) => s + c.tabSwitches, 0);
    critical_issues.push({
      issue: "Javob davomida tashqi manbalardan foydalanish belgilari qayd etildi",
      evidence: `${cheats.length} savolda tab almashish (${tabTotal} marta) yoki matn joylashtirish (paste) aniqlandi`,
      severity: "o'rta"
    });
  }
  if (critical_issues.length === 0) {
    critical_issues.push({
      issue: "Jiddiy texnik muammo aniqlanmadi, lekin javoblar chuqurligi sinovdan o'tmagan",
      evidence: "Barcha savollarda qoniqarli javob berildi",
      severity: "past"
    });
  }

  // Ustuvorlik bilan focus
  const focusSource = stats
    .filter((s) => s.wrong > 0)
    .sort((a, b) => b.wrong / b.total - a.wrong / a.total || b.wrong - a.wrong)
    .slice(0, 3);
  const slugOf = (topic: string) => transcript.find((t) => t.topic === topic)?.topicSlug ?? "";
  const focus_areas: FocusArea[] = focusSource.map((s, i) => ({
    topic: s.topic,
    priority: i + 1,
    why: `${s.total} savoldan ${s.wrong} tasida xato${s.avgScore !== null ? `, o'rtacha ball ${s.avgScore}/100` : ""} — bu eng ko'p ball yo'qotgan joyingiz`,
    how: TOPIC_ADVICE[slugOf(s.topic)] ?? ADVICE_FALLBACK
  }));
  if (focus_areas.length === 0 && stats.length > 0) {
    focus_areas.push({
      topic: stats[0].topic,
      priority: 1,
      why: "Xato yo'q, lekin chuqurlikni oshirish kerak — savollar darajasini ko'tarish tavsiya etiladi",
      how: TOPIC_ADVICE[slugOf(stats[0].topic)] ?? ADVICE_FALLBACK
    });
  }

  return {
    overall_score: overall,
    level,
    strengths: strengths.slice(0, 4),
    weaknesses: weaknesses.slice(0, 4),
    critical_issues: critical_issues.slice(0, 4),
    focus_areas,
    topic_stats: stats
  };
}

/** Lokal tahlildan xulosa matni (AI xulosasi bo'lmasa ishlatiladi) */
function localSummary(name: string, transcript: TranscriptItem[], local: ReturnType<typeof analyzeTranscript>): string {
  const correct = transcript.filter((t) => t.isCorrect === true).length;
  const weakest = local.focus_areas[0];
  const verdict =
    local.overall_score >= 70
      ? "Umuman olganda bilim bazasi yaxshi, lekin bir nechta mavzuda bo'shliq bor."
      : local.overall_score >= 45
        ? "Bilim bazasi o'rtacha: asosiy tushunchalar bor, ammo izohlash va chuqurlik yetishmaydi."
        : "Bilim bazasi juda past: javoblar yuzaki, asosiy tushunchalar ham tushib qolgan.";
  return (
    `${name} ${transcript.length} savoldan ${correct} tasida to'g'ri javob berdi, umumiy ball ${local.overall_score}/100 (daraja: ${local.level}). ` +
    `${verdict}` +
    (weakest ? ` Eng katta muammo — "${weakest.topic}" mavzusi: ${weakest.why}.` : "")
  );
}

/**
 * Yakuniy hisobot. AI javob bersa — uni ishlatamiz, lekin mavzu statistikasi va
 * ochiq tanqid qismi har holda lokal hisoblanadi (AI ularni tashlab ketishi mumkin).
 */
export async function finalReport(args: {
  candidateName: string;
  track?: string | null;
  transcript: TranscriptItem[];
  antiCheat?: { tabSwitches: number; pasted: boolean }[];
}): Promise<{ report: FinalReport; provider: AIProvider }> {
  const local = analyzeTranscript(args.transcript, args.antiCheat ?? []);
  const nextSteps = local.focus_areas.map(
    (f) => `${f.topic}: ${f.how}`
  );

  const fallbackReport: FinalReport = {
    level: local.level,
    overall_score: local.overall_score,
    summary: localSummary(args.candidateName, args.transcript, local),
    strengths: local.strengths,
    weaknesses: local.weaknesses,
    critical_issues: local.critical_issues,
    focus_areas: local.focus_areas,
    topics_to_improve: local.focus_areas,
    topic_stats: local.topic_stats,
    hiring_recommendation: local.overall_score >= 70 ? "ha" : local.overall_score >= 40 ? "shartli" : "yo'q",
    culture_note:
      "Bu xulosa javoblaringiz statistikasi asosida (AI'siz) tuzildi — eng ishonchli qismi shu: xato qaysi mavzuda va nechta.",
    next_steps: nextSteps.length > 0 ? nextSteps : ["Zaif mavzularni konspekt qilib, keyin qayta intervyu topshiring"]
  };

  const tpl = await activePrompt("final_report");
  if (!tpl) return { provider: "mock", report: fallbackReport };

  const statsLine = local.topic_stats
    .map((s) => `${s.topic}: ${s.total - s.wrong}/${s.total} to'g'ri${s.avgScore !== null ? `, o'rtacha ${s.avgScore}/100` : ""}`)
    .join("; ");

  const transcript = args.transcript
    .map(
      (t, i) =>
        `${i + 1}. [${t.topic}, ${t.difficulty}/5] ${clip(t.question, 200)}\nJavob: ${clip(t.answer, 350)}\nTo'g'ri: ${t.isCorrect ?? "-"}${t.aiScore !== null ? `, AI ball: ${t.aiScore}` : ""}`
    )
    .join("\n\n");

  const res = await callAI(
    "final_report",
    fill(tpl, {
      transcript,
      candidate: args.candidateName,
      track: args.track ?? "umumiy",
      stats: statsLine,
      stats_line: statsLine
    }),
    { budgetMs: 30000, maxOutputTokens: 2200 }
  );

  if (res.ok && typeof res.data.overall_score === "number") {
    const aiIssues = Array.isArray(res.data.critical_issues) ? (res.data.critical_issues as CriticalIssue[]) : [];
    const aiFocus = Array.isArray(res.data.focus_areas) ? (res.data.focus_areas as FocusArea[]) : [];
    const aiTopics = Array.isArray(res.data.topics_to_improve) ? (res.data.topics_to_improve as FocusArea[]) : [];
    const critical = aiIssues.length > 0 ? aiIssues : local.critical_issues;
    const focus = aiFocus.length > 0 ? aiFocus : aiTopics.length > 0 ? aiTopics : local.focus_areas;
    return {
      provider: res.provider,
      report: {
        level: String(res.data.level ?? local.level),
        overall_score: Math.round(res.data.overall_score as number),
        summary: String(res.data.summary ?? fallbackReport.summary),
        strengths: Array.isArray(res.data.strengths) && res.data.strengths.length > 0 ? (res.data.strengths as string[]) : local.strengths,
        weaknesses:
          Array.isArray(res.data.weaknesses) && res.data.weaknesses.length > 0 ? (res.data.weaknesses as string[]) : local.weaknesses,
        critical_issues: critical,
        focus_areas: focus.map((f, i) => ({ ...f, priority: typeof f.priority === "number" ? f.priority : i + 1 })),
        topics_to_improve: focus,
        topic_stats: local.topic_stats, // har doim aniq statistika
        hiring_recommendation: (["ha", "yo'q", "shartli"].includes(String(res.data.hiring_recommendation))
          ? res.data.hiring_recommendation
          : fallbackReport.hiring_recommendation) as FinalReport["hiring_recommendation"],
        culture_note: String(res.data.culture_note ?? fallbackReport.culture_note),
        next_steps: Array.isArray(res.data.next_steps) && res.data.next_steps.length > 0 ? (res.data.next_steps as string[]) : nextSteps
      }
    };
  }

  return { provider: "mock", report: fallbackReport };
}
