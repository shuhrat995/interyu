import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/api";

const DAYS = 30;
const LEVEL_ORDER = ["junior", "junior+", "middle", "middle+", "senior"];

/** YYYY-MM-DD (mahalliy vaqt bo'yicha) */
function dayKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export const GET = withAuth(async () => {
  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (DAYS - 1));

  const [interviews, answers, topics, aiCalls] = await Promise.all([
    prisma.interview.findMany({
      select: {
        id: true,
        status: true,
        startedAt: true,
        finishedAt: true,
        aiReportJson: true,
        _count: { select: { answers: true } }
      }
    }),
    prisma.answer.findMany({
      select: {
        isCorrect: true,
        aiScore: true,
        question: { select: { topicId: true, difficulty: true, type: true } }
      }
    }),
    prisma.topic.findMany({ select: { id: true, name: true, color: true } }),
    prisma.aICallLog.aggregate({
      where: { status: "ok" },
      _sum: { inputTokens: true, outputTokens: true },
      _count: true
    })
  ]);

  // --- Intervyular dinamikasi (kunlik, oxirgi 30 kun) ---
  const buckets = new Map<string, { date: string; started: number; finished: number }>();
  for (let i = 0; i < DAYS; i++) {
    const d = new Date(from.getFullYear(), from.getMonth(), from.getDate() + i);
    const key = dayKey(d);
    buckets.set(key, { date: key, started: 0, finished: 0 });
  }
  for (const iv of interviews) {
    const sk = dayKey(iv.startedAt);
    const s = buckets.get(sk);
    if (s) s.started += 1;
    if (iv.finishedAt) {
      const fk = dayKey(iv.finishedAt);
      const f = buckets.get(fk);
      if (f) f.finished += 1;
    }
  }
  const daily = Array.from(buckets.values());

  // --- Ball taqsimoti va daraja (yakunlangan intervyular hisobotidan) ---
  const scoreBuckets = Array.from({ length: 10 }, (_, i) => ({
    label: `${i * 10}-${i * 10 + 10}`,
    count: 0
  }));
  const levelCount = new Map<string, number>();
  let scoreSum = 0;
  let scoreCount = 0;

  for (const iv of interviews) {
    if (!iv.aiReportJson) continue;
    let report: { overall_score?: number; level?: string } = {};
    try {
      report = JSON.parse(iv.aiReportJson);
    } catch {
      continue;
    }
    const score = typeof report.overall_score === "number" ? report.overall_score : null;
    if (score !== null) {
      const clamped = Math.max(0, Math.min(100, score));
      const idx = Math.min(9, Math.floor(clamped / 10));
      scoreBuckets[idx].count += 1;
      scoreSum += clamped;
      scoreCount += 1;
    }
    const level = (report.level || "noma'lum").toLowerCase();
    levelCount.set(level, (levelCount.get(level) ?? 0) + 1);
  }

  const levels = Array.from(levelCount.entries())
    .map(([level, count]) => ({ level, count }))
    .sort((a, b) => {
      const ai = LEVEL_ORDER.indexOf(a.level);
      const bi = LEVEL_ORDER.indexOf(b.level);
      return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
    });

  // --- Mavzu xatolari ---
  const topicById = new Map(topics.map((t) => [t.id, t]));
  type TopicAgg = { topicId: string; name: string; color: string; total: number; errors: number; scoreSum: number; scoreCount: number };
  const topicAgg = new Map<string, TopicAgg>();

  for (const a of answers) {
    const t = topicById.get(a.question.topicId);
    if (!t) continue;
    let agg = topicAgg.get(t.id);
    if (!agg) {
      agg = { topicId: t.id, name: t.name, color: t.color, total: 0, errors: 0, scoreSum: 0, scoreCount: 0 };
      topicAgg.set(t.id, agg);
    }
    agg.total += 1;
    // xato: MCQ noto'g'ri yoki yozma ball 40 dan past
    if (a.isCorrect === false || (a.aiScore !== null && a.aiScore < 40)) agg.errors += 1;
    if (a.aiScore !== null) {
      agg.scoreSum += a.aiScore;
      agg.scoreCount += 1;
    }
  }

  const topicRows = Array.from(topicAgg.values())
    .map((t) => ({
      topic: t.name,
      color: t.color,
      total: t.total,
      errors: t.errors,
      errorRate: t.total ? Math.round((t.errors / t.total) * 100) : 0,
      avgScore: t.scoreCount ? Math.round(t.scoreSum / t.scoreCount) : null
    }))
    .sort((a, b) => b.errorRate - a.errorRate || b.errors - a.errors);

  // --- KPI ---
  const finished = interviews.filter((i) => i.status === "finished");
  const durations = finished
    .filter((i) => i.finishedAt)
    .map((i) => (i.finishedAt as Date).getTime() - i.startedAt.getTime());
  const avgDurationMin = durations.length
    ? Math.round(durations.reduce((s, d) => s + d, 0) / durations.length / 60000)
    : 0;

  const kpi = {
    totalInterviews: interviews.length,
    finished: finished.length,
    inProgress: interviews.filter((i) => i.status === "in_progress").length,
    completionRate: interviews.length ? Math.round((finished.length / interviews.length) * 100) : 0,
    avgScore: scoreCount ? Math.round(scoreSum / scoreCount) : null,
    avgDurationMin,
    totalAnswers: answers.length,
    aiCalls: aiCalls._count,
    aiTokens: (aiCalls._sum.inputTokens ?? 0) + (aiCalls._sum.outputTokens ?? 0)
  };

  return NextResponse.json({ kpi, daily, scoreBuckets, levels, topics: topicRows, days: DAYS });
});
