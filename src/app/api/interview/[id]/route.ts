import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { jsonError } from "@/lib/api";
import { getSettings, parseAskedIds, toServed } from "@/lib/interview";

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const interview = await prisma.interview.findUnique({
    where: { id },
    include: {
      answers: {
        select: {
          questionId: true,
          isCorrect: true,
          aiScore: true,
          selectedIndex: true,
          answerText: true,
          aiResultJson: true
        },
        orderBy: { createdAt: "asc" }
      }
    }
  });
  if (!interview) return jsonError(404, "Sessiya topilmadi");

  // Javoblar tarixi: 1-based index + skipped belgisi (frontend xaritasi uchun)
  const SKIP_MARKERS = new Set(["[o'tkazib yuborildi]", "[vaqt tugadi]"]);
  const answers = interview.answers.map((a, i) => {
    let skipped = false;
    try {
      const r = a.aiResultJson ? (JSON.parse(a.aiResultJson) as { skipped?: boolean }) : null;
      if (r?.skipped === true) skipped = true;
    } catch {
      /* ignore */
    }
    if (!skipped && a.selectedIndex === null && (!a.answerText || SKIP_MARKERS.has(a.answerText.trim()))) {
      skipped = true;
    }
    return { index: i + 1, isCorrect: a.isCorrect, skipped };
  });

  const settings = await getSettings();
  const answered = interview.answers.length;

  if (interview.status !== "in_progress") {
    let report = null;
    try {
      report = interview.aiReportJson ? JSON.parse(interview.aiReportJson) : null;
    } catch {
      report = null;
    }
    return NextResponse.json({
      status: interview.status,
      candidateName: interview.candidateName,
      track: interview.track,
      stack: interview.stack ?? null,
      answered,
      total: settings.totalQuestions,
      question: null,
      answers,
      report
    });
  }

  // Joriy savolni qaytarish (javob berilmagan)
  let question = null;
  if (interview.currentQuestionId) {
    const q = await prisma.question.findUnique({ where: { id: interview.currentQuestionId } });
    if (q) {
      question = { ...toServed(q, answered + 1, settings.totalQuestions), servedAt: interview.currentServedAt?.toISOString() ?? null };
    }
  }

  return NextResponse.json({
    status: interview.status,
    candidateName: interview.candidateName,
    track: interview.track,
    stack: interview.stack ?? null,
    currentLevel: interview.currentLevel,
    answered,
    total: settings.totalQuestions,
    question,
    answers,
    report: null
  });
}
