import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { jsonError } from "@/lib/api";
import { getSettings, parseAskedIds, toServed } from "@/lib/interview";

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const interview = await prisma.interview.findUnique({
    where: { id },
    include: {
      answers: { select: { questionId: true, isCorrect: true, aiScore: true } }
    }
  });
  if (!interview) return jsonError(404, "Sessiya topilmadi");

  const settings = await getSettings();
  const answered = interview.answers.length;

  if (interview.status !== "in_progress") {
    return NextResponse.json({
      status: interview.status,
      candidateName: interview.candidateName,
      track: interview.track,
      answered,
      total: settings.totalQuestions,
      question: null,
      report: interview.aiReportJson ? JSON.parse(interview.aiReportJson) : null
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
    currentLevel: interview.currentLevel,
    answered,
    total: settings.totalQuestions,
    question,
    report: null
  });
}
