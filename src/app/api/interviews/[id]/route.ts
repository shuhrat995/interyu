import { NextResponse, NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { audit, jsonError, withAuth } from "@/lib/api";

type Ctx = { params: Promise<{ id: string }> };

export const GET = withAuth<{ id: string }>(async ({ params }) => {
  const { id } = params;
  const interview = await prisma.interview.findUnique({
    where: { id },
    include: {
      answers: {
        include: {
          question: { include: { topic: { select: { name: true, color: true } } } }
        },
        orderBy: { createdAt: "asc" }
      },
      notes: { include: { author: { select: { name: true } } }, orderBy: { createdAt: "desc" } },
      tags: true
    }
  });
  if (!interview) return jsonError(404, "Intervyu topilmadi");

  let report: unknown = null;
  try {
    report = interview.aiReportJson ? JSON.parse(interview.aiReportJson) : null;
  } catch {
    report = null;
  }

  let antiCheat: unknown[] = [];
  try {
    const parsed = JSON.parse(interview.antiCheatJson);
    if (Array.isArray(parsed)) antiCheat = parsed;
  } catch {
    antiCheat = [];
  }

  const transcript = interview.answers.map((a) => {
    let ai: { score?: number; verdict?: string; strengths?: string[]; gaps?: string[]; misconceptions?: string[]; interviewer_note?: string; followup?: string | null; provider?: string } | null = null;
    try {
      ai = a.aiResultJson ? JSON.parse(a.aiResultJson) : null;
    } catch {
      ai = null;
    }
    return {
      id: a.id,
      questionId: a.questionId,
      questionVersion: a.questionVersion,
      questionText: a.question.text,
      topic: a.question.topic,
      difficulty: a.question.difficulty,
      type: a.question.type,
      timeLimit: a.question.timeLimit,
      selectedIndex: a.selectedIndex,
      answerText: a.answerText,
      isCorrect: a.isCorrect,
      aiScore: a.aiScore,
      ai,
      timeSpent: a.timeSpent,
      createdAt: a.createdAt
    };
  });

  return NextResponse.json({
    interview: {
      id: interview.id,
      candidateName: interview.candidateName,
      status: interview.status,
      track: interview.track,
      currentLevel: interview.currentLevel,
      startedAt: interview.startedAt,
      finishedAt: interview.finishedAt,
      settings: safeJson(interview.settingsJson)
    },
    report,
    antiCheat,
    transcript,
    notes: interview.notes,
    tags: interview.tags
  });
});

const patchSchema = z.object({
  note: z.string().min(1).max(2000).optional(),
  addTag: z.object({ label: z.string().min(1).max(40), color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional() }).optional(),
  removeTagId: z.string().optional(),
  status: z.enum(["in_progress", "finished", "abandoned"]).optional()
});

export const PATCH = withAuth<{ id: string }>(async ({ req, params, session }) => {
  const { id } = params;
  const raw = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(raw);
  if (!parsed.success) return jsonError(422, "Noto'g'ri ma'lumot");
  const { note, addTag, removeTagId, status } = parsed.data;

  const interview = await prisma.interview.findUnique({ where: { id } });
  if (!interview) return jsonError(404, "Intervyu topilmadi");

  if (note) {
    await prisma.interviewNote.create({ data: { interviewId: id, authorId: session.sub, body: note } });
    await audit(req, session.sub, "note_add", "interview", id, null, { note });
  }
  if (addTag) {
    await prisma.interviewTag.upsert({
      where: { interviewId_label: { interviewId: id, label: addTag.label } },
      update: { color: addTag.color ?? "#6d8cff" },
      create: { interviewId: id, label: addTag.label, color: addTag.color ?? "#6d8cff" }
    });
    await audit(req, session.sub, "tag_add", "interview", id, null, addTag);
  }
  if (removeTagId) {
    await prisma.interviewTag.deleteMany({ where: { id: removeTagId, interviewId: id } });
    await audit(req, session.sub, "tag_remove", "interview", id, null, { removeTagId });
  }
  if (status) {
    await prisma.interview.update({ where: { id }, data: { status } });
    await audit(req, session.sub, "status_change", "interview", id, interview.status, status);
  }

  return NextResponse.json({ ok: true });
});

function safeJson(v: string | null): unknown {
  try {
    return v ? JSON.parse(v) : null;
  } catch {
    return null;
  }
}
