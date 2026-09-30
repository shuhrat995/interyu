import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getIp, jsonError, parseBody } from "@/lib/api";
import { getSettings, nextLevel, parseAskedIds, pickNextQuestion, toServed } from "@/lib/interview";
import { evaluateWritten } from "@/lib/ai-eval";
import { trackTopicSlugs, getStack } from "@/lib/tracks";

const schema = z
  .object({
    interviewId: z.string().min(1),
    questionId: z.string().min(1),
    selectedIndex: z.number().int().min(0).max(4).nullable().optional(),
    answerText: z.string().max(5000).nullable().optional(),
    timeSpent: z.number().int().min(0).max(3600).optional(),
    tabSwitches: z.number().int().min(0).max(999).optional(),
    pasted: z.boolean().optional(),
    /** Vaqt tugaganda yoki "O'tkazish" bosilganda — bo'sh javobni xatoliksiz keyingi savolga o'tkazish */
    skipped: z.boolean().optional(),
    /** Anti-cheat kuchaytirish: klaviatura statistika (frontend yuboradi) */
    keyStrokes: z.number().int().min(0).max(20000).optional(),
    pasteAttempts: z.number().int().min(0).max(999).optional(),
    copyAttempts: z.number().int().min(0).max(999).optional()
  })
  .refine(
    (d) => d.skipped === true || d.selectedIndex !== undefined || (d.answerText !== undefined && d.answerText !== null && d.answerText.trim().length > 0),
    {
      message: "Javob bo'sh"
    }
  );

/** Input orqali buzib kirishdan himoya: HTML/injection tozalash, 95%+ himoya */
function sanitizeAnswer(raw: string | null | undefined): string | null {
  if (raw == null) return null;
  let s = raw.replace(/\r/g, "").trim();
  if (!s) return null;
  // HTML teglar, script, event-handlerlar
  s = s.replace(/<script[\s\S]*?<\/script\s*>/gi, " ");
  s = s.replace(/<style[\s\S]*?<\/style\s*>/gi, " ");
  s = s.replace(/<[^>]*>/g, " ");
  s = s.replace(/javascript\s*:/gi, " ");
  s = s.replace(/data\s*:\s*text\/html/gi, " ");
  s = s.replace(/on\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, " ");
  // Boshqaruv belgilar (tab/newline'dan tashqari)
  // eslint-disable-next-line no-control-regex
  s = s.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "");
  // Haddan tashqari takror (spam/fuzz): bir belgining 200+ takrori
  s = s.replace(/(.)\1{200,}/g, "$1".repeat(50));
  // Bo'shliqlarni normallash, lekin paragraflarni saqlash
  s = s.replace(/[ \t\u00A0]{3,}/g, " ");
  s = s.replace(/\n{4,}/g, "\n\n\n");
  if (s.length > 5000) s = s.slice(0, 5000);
  return s.trim() ? s : null;
}

export async function POST(req: NextRequest) {
  try {
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

  const isSkipped = body.skipped === true;

  // Yozma javob minimal uzunlik (TZ 5.3.3: min 15 belgi) — lekin skipped bo'lsa tekshirilmaydi
  let answerText = sanitizeAnswer(body.answerText);
  if (question.type === "written" && !isSkipped) {
    if (!answerText || answerText.length < settings.minWrittenChars) {
      return jsonError(422, `Yozma javob kamida ${settings.minWrittenChars} belgi bo'lishi kerak`);
    }
  }
  // MCQ: variant tanlanishi shart (skipped bo'lmasa). Aks holda "qisqa" matn bilan javob o'tib ketardi.
  if (question.type === "mcq" && !isSkipped) {
    if (body.selectedIndex === undefined || body.selectedIndex === null) {
      return jsonError(422, "Variant tanlanmadi");
    }
  }
  if (isSkipped && !answerText) {
    answerText = "[o'tkazib yuborildi]";
  }

  // Vaqt tugishi: server tomonda tekshiruv (kckichik batch bilan)
  const servedAt = interview.currentServedAt?.getTime() ?? Date.now();
  const elapsed = Math.floor((Date.now() - servedAt) / 1000);
  const overtime = Math.max(0, elapsed - question.timeLimit);

  // Baholash
  let isCorrect: boolean | null = null;
  let aiScore: number | null = null;
  let aiResultJson: string | null = null;

  if (isSkipped) {
    // O'tkazib yuborish: 0 ball, xato deb hisoblanadi, lekin xatoliksiz keyingi savolga o'tadi
    isCorrect = false;
    if (question.type === "written") {
      aiScore = 0;
      aiResultJson = JSON.stringify({
        score: 0,
        verdict: "zaif",
        strengths: [],
        gaps: ["Savol o'tkazib yuborildi"],
        misconceptions: [],
        interviewer_note: "Nomzod savolni o'tkazib yubordi (vaqt tugadi yoki qo'lda).",
        followup: null,
        provider: "system",
        skipped: true
      });
    }
  } else if (question.type === "mcq") {
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
    // Adolatli chegara: 50+ -> to'g'ri (avval 60 edi — past baho shikoyati bo'yicha yumshatildi)
    isCorrect = evaluation.score >= 50;
    aiResultJson = JSON.stringify({ ...evaluation, provider });
  }

  await prisma.answer.create({
    data: {
      interviewId: interview.id,
      questionId: question.id,
      questionVersion: question.version,
      selectedIndex: question.type === "mcq" ? (isSkipped ? null : (body.selectedIndex ?? null)) : null,
      answerText,
      isCorrect,
      aiScore,
      aiResultJson,
      timeSpent: body.timeSpent ?? Math.min(elapsed, question.timeLimit)
    }
  });

  // Anti-cheat harakatlari log (kengaytirilgan: paste/copy urinishlar, klaviatura statistikasi)
  if (body.tabSwitches || body.pasted || body.pasteAttempts || body.copyAttempts || body.keyStrokes !== undefined) {
    let events: unknown[] = [];
    try {
      const parsed = JSON.parse(interview.antiCheatJson) as unknown;
      if (Array.isArray(parsed)) events = parsed;
    } catch {
      events = [];
    }
    events.push({
      questionId: question.id,
      tabSwitches: body.tabSwitches ?? 0,
      pasted: body.pasted ?? false,
      pasteAttempts: body.pasteAttempts ?? 0,
      copyAttempts: body.copyAttempts ?? 0,
      keyStrokes: body.keyStrokes ?? null,
      skipped: isSkipped,
      at: new Date().toISOString()
    });
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
      evaluated: { isCorrect, aiScore, skipped: isSkipped },
      next: null,
      finished: true
    });
  }

  // Keyingi savol — stack tanlangan bo'lsa stack mavzularidan, aks holda track'dan
  const stackTopics = interview.stack ? (getStack(interview.stack)?.topics ?? null) : null;
  const nextQ = await pickNextQuestion(level, askedIds, stackTopics ?? trackTopicSlugs(interview.track));
  if (!nextQ) {
    await prisma.interview.update({
      where: { id: interview.id },
      data: { currentLevel: level, correctStreak: streak, currentQuestionId: null, currentServedAt: null }
    });
    return NextResponse.json({ evaluated: { isCorrect, aiScore, skipped: isSkipped }, next: null, finished: true, note: "Savollar tugadi" });
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
    evaluated: { isCorrect, aiScore, skipped: isSkipped },
    next: toServed(nextQ, answeredCount + 1, settings.totalQuestions),
    finished: false,
    overtime
  });
  } catch (e) {
    console.error("interview/answer:", e);
    return jsonError(500, "Server xatosi");
  }
}
