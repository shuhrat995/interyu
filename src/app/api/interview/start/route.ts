import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getIp, jsonError, parseBody } from "@/lib/api";
import { logVisit, isBot } from "@/lib/analytics";
import { getSettings, pickNextQuestion, toServed } from "@/lib/interview";
import { trackTopicSlugs, TRACK_SLUGS } from "@/lib/tracks";

const schema = z.object({
  name: z.string().min(2).max(80),
  track: z.enum(TRACK_SLUGS as [string, ...string[]]).optional()
});

export async function POST(req: NextRequest) {
  const parsed = await parseBody(req, schema);
  if (!parsed.ok) return parsed.res;
  const { name } = parsed.data;
  const track = parsed.data.track ?? "frontend";
  const topics = trackTopicSlugs(track);

  const settings = await getSettings();
  const available = await prisma.question.count({
    where: { deletedAt: null, isActive: true, topic: { slug: { in: topics } } }
  });
  if (available === 0) return jsonError(503, "Bu yo'nalish uchun savollar hozircha tayyor emas");

  const interview = await prisma.interview.create({
    data: {
      candidateName: name,
      track,
      currentLevel: 0,
      settingsJson: JSON.stringify(settings)
    }
  });

  const q = await pickNextQuestion(0, [], topics);
  if (!q) {
    await prisma.interview.update({ where: { id: interview.id }, data: { status: "abandoned" } });
    return jsonError(503, "Savollar topilmadi");
  }

  await prisma.interview.update({
    where: { id: interview.id },
    data: {
      askedIdsJson: JSON.stringify([q.id]),
      currentQuestionId: q.id,
      currentServedAt: new Date()
    }
  });

  // Analitika: intervyu boshlandi (cookie vid bo'lsa)
  const vid = req.cookies.get("vid")?.value;
  if (vid && !isBot(req.headers.get("user-agent"))) {
    await logVisit({ path: "/interview", visitorId: vid, kind: "interview_start", userAgent: req.headers.get("user-agent") });
  }

  await prisma.auditLog.create({
    data: {
      action: "interview_start",
      entity: "interview",
      entityId: interview.id,
      ip: getIp(req),
      afterJson: JSON.stringify({ name, track })
    }
  });

  return NextResponse.json({
    interviewId: interview.id,
    track,
    question: toServed(q, 1, settings.totalQuestions)
  });
}
