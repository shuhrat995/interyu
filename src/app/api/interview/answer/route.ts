import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getIp, jsonError, parseBody } from "@/lib/api";
import { getSettings, nextLevel, parseAskedIds, pickNextQuestion, toServed } from "@/lib/interview";
import { evaluateWritten } from "@/lib/ai-eval";
import { trackTopicSlugs } from "@/lib/tracks";

const schema = z
  .object({
    interviewId: z.string().min(1),
    questionId: z.string().min(1),
    selectedIndex: z.number().int().min(0).max(4).nullable().optional(),
    answerText: z.string().max(5000).nullable().optional(),
    timeSpent: z.number().int().min(0).max(3600).optional(),
    tabSwitches: z.number().int().min(0).max(999).optional(),
    pasted: z.boolean().optional()
  })
  .refine((d) => d.selectedIndex !== undefined || (d.answerText !== undefined && d.answerText !== null && d.answerText.trim().length > 0), {
    message: "Javob bo'sh"
  });

export async function POST(req: NextRequest) {
  const parsed = await parseBody(req, schema);
  if (!parsed.ok) return parsed.res;
  const body = parsed.data;

  const interview = await prisma.interview.findUnique({ where: { id: body.interviewId } });
  if (!interview) return jsonError(404, "Sessiya topilmadi");
  if (interview.status !== "in_progress") return jsonError(409, "Sessiya yakunlangan");

  // TZ 5.3.5: bir savolga ikkinchi javob yo'q (DB unique ham bor)
  const dup = await prisma.answer.findUnique({
    where: { interviewId_questionId: { interviewId: interview.id, questionId: body.questionId } }
  });
  if (dup) return jsonError(409, "Bu savolga javob allaqachon berilgan");

  // TZ 5.3.3: faqat ko'rsatilgan savolga javob qabul qilinadi
  if (interview.currentQuestionId !== body.questionId) {
    return jsonError(403, "Bu savol hozir ko'rsatilmagan");
  }

  const question = await prisma.question.findUnique({ where: { id: body.questionId }, include: { topic: true } });
  if (!question) return jsonError(404, "Savol topilmadi");

  const settings = await getSettings();
  const askedIds = parseAskedIds(interview.askedIdsJson);

  // Yozma javob minimal uzunlik (TZ 5.3.3: min 15 belgi)
  let answerText = body.answerText?.trim() ?? null;
  if (question.type === "written") {
    if (!answerText || answerText.length < settings.minWrittenChars) {
      return jsonError(422, `Yozma javob kamida ${settings.minWrittenChars} belgi bo'lishi kerak`);
    }
  }

  // Vaqt tugishi: server tomonda tekshiruv (kckichik batch bilan)
  const servedAt = interview.currentServedAt?.getTime() ?? Date.now();
  const elapsed = Math.floor((Date.now() - servedAt) / 1000);
  const overtime = Math.max(0, elapsed - question.timeLimit);

  // Baholash
  let isCorrect: boolean | null = null;
  let aiScore: number | null = null;
  let aiResultJson: string | null = null;

  if (question.type === "mcq") {
    isCorrect = body.selectedIndex === question.correctIndex;
  } else {
    const keywords = question.keywords ? question.keywords.split(",").filter(Boolean) : [];
    const { evaluation, provider } = await evaluateWritten({
      question: question.text,
      answer: answerText ?? "",
      rubric: question.rubric ?? "",
      keywords,
      difficulty: question.difficulty,
      topic: question.topic.name
    });
    aiScore = evaluation.score;
    // TZ 5.3.4: aiScore >= 60 -> to'g'ri hisoblanadi
    isCorrect = evaluation.score >= 60;
    aiResultJson = JSON.stringify({ ...evaluation, provider });
  }

  await prisma.answer.create({
    data: {
      interviewId: interview.id,
      questionId: question.id,
      questionVersion: question.version,
      selectedIndex: question.type === "mcq" ? (body.selectedIndex ?? null) : null,
      answerText,
      isCorrect,
      aiScore,
      aiResultJson,
      timeSpent: body.timeSpent ?? Math.min(elapsed, question.timeLimit)
    }
  });

  // Anti-cheat harakatlari log
  if (body.tabSwitches || body.pasted) {
    const events = JSON.parse(interview.antiCheatJson) as unknown[];
    events.push({ questionId: question.id, tabSwitches: body.tabSwitches ?? 0, pasted: body.pasted ?? false, at: new Date().toISOString() });
    await prisma.interview.update({ where: { id: interview.id }, data: { antiCheatJson: JSON.stringify(events.slice(-100)) } });
  }

  // Adaptiv daraja (TZ 5.3.4)
  const answeredCount = askedIds.length;
  const { level, streak } = nextLevel(interview.currentLevel, Boolean(isCorrect), interview.correctStreak, settings.adaptiveEnabled);

  // Barcha savollar javoblandimi?
  if (answeredCount >= settings.totalQuestions) {
    await prisma.interview.update({
      where: { id: interview.id },
      data: { currentLevel: level, correctStreak: streak, currentQuestionId: null, currentServedAt: null }
    });
    return NextResponse.json({
      evaluated: { isCorrect, aiScore },
      next: null,
      finished: true
    });
  }

  // Keyingi savol — nomzod tanlagan yo'nalish ichidan
  const nextQ = await pickNextQuestion(level, askedIds, trackTopicSlugs(interview.track));
  if (!nextQ) {
    await prisma.interview.update({
      where: { id: interview.id },
      data: { currentLevel: level, correctStreak: streak, currentQuestionId: null, currentServedAt: null }
    });
    return NextResponse.json({ evaluated: { isCorrect, aiScore }, next: null, finished: true, note: "Savollar tugadi" });
  }

  await prisma.interview.update({
    where: { id: interview.id },
    data: {
      currentLevel: level,
      correctStreak: streak,
      askedIdsJson: JSON.stringify([...askedIds, nextQ.id]),
      currentQuestionId: nextQ.id,
      currentServedAt: new Date()
    }
  });

  return NextResponse.json({
    evaluated: { isCorrect, aiScore },
    next: toServed(nextQ, answeredCount + 1, settings.totalQuestions),
    finished: false,
    overtime
  });
}
