import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { jsonError, parseBody } from "@/lib/api";
import { logVisit } from "@/lib/analytics";
import { finalReport } from "@/lib/ai-eval";

const schema = z.object({ interviewId: z.string().min(1) });

export async function POST(req: NextRequest) {
  const parsed = await parseBody(req, schema);
  if (!parsed.ok) return parsed.res;
  const { interviewId } = parsed.data;

  const interview = await prisma.interview.findUnique({
    where: { id: interviewId },
    include: {
      answers: { include: { question: { include: { topic: true } } }, orderBy: { createdAt: "asc" } }
    }
  });
  if (!interview) return jsonError(404, "Sessiya topilmadi");
  if (interview.status === "finished") {
    return NextResponse.json({ report: JSON.parse(interview.aiReportJson ?? "{}") });
  }

  const transcript = interview.answers.map((a) => ({
    question: a.question.text,
    answer: a.answerText ?? (a.selectedIndex !== null ? `Variant ${a.selectedIndex + 1}` : ""),
    isCorrect: a.isCorrect,
    aiScore: a.aiScore,
    topic: a.question.topic.name,
    topicSlug: a.question.topic.slug,
    difficulty: a.question.difficulty
  }));

  let antiCheat: { tabSwitches: number; pasted: boolean }[] = [];
  try {
    const events = JSON.parse(interview.antiCheatJson) as { tabSwitches?: number; pasted?: boolean }[];
    antiCheat = Array.isArray(events) ? events.map((e) => ({ tabSwitches: e.tabSwitches ?? 0, pasted: e.pasted ?? false })) : [];
  } catch {
    antiCheat = [];
  }

  const { report, provider } = await finalReport({
    candidateName: interview.candidateName,
    track: interview.track,
    transcript,
    antiCheat
  });

  await prisma.interview.update({
    where: { id: interview.id },
    data: { status: "finished", finishedAt: new Date(), aiReportJson: JSON.stringify({ ...report, provider }) }
  });

  const vid = req.cookies.get("vid")?.value;
  if (vid) {
    await logVisit({ path: "/interview", visitorId: vid, kind: "interview_finish" });
  }

  await prisma.auditLog.create({
    data: {
      action: "interview_finish",
      entity: "interview",
      entityId: interview.id,
      afterJson: JSON.stringify({ overall: report.overall_score, level: report.level, provider })
    }
  });

  return NextResponse.json({ report: { ...report, provider } });
}
