import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getIp, jsonError, parseBody } from "@/lib/api";
import { logVisit, isBot } from "@/lib/analytics";
import { getSettings, pickNextQuestion, toServed } from "@/lib/interview";
import { trackTopicSlugs, TRACK_SLUGS, getStack, isStackSlug } from "@/lib/tracks";

const schema = z.object({
  name: z.string().min(2).max(80),
  track: z.enum(TRACK_SLUGS as [string, ...string[]]).optional(),
  stack: z.string().min(1).max(32).optional()
});

export async function POST(req: NextRequest) {
  try {
    const parsed = await parseBody(req, schema);
    if (!parsed.ok) return parsed.res;
    const { name } = parsed.data;
    const track = parsed.data.track ?? getStack(parsed.data.stack)?.track ?? "frontend";
    // Stack tanlangan bo'lsa — shu track'ga tegishli bo'lishi shart
    const stack = parsed.data.stack && isStackSlug(parsed.data.stack) ? parsed.data.stack : null;
    if (parsed.data.stack && !stack) return jsonError(422, "Bunday stack yo'q");
    if (stack && getStack(stack)?.track !== track) return jsonError(422, "Stack bu yo'nalishga tegishli emas");
    const topics = stack ? (getStack(stack)?.topics ?? trackTopicSlugs(track)) : trackTopicSlugs(track);

    const settings = await getSettings();
    const available = await prisma.question.count({
      where: { deletedAt: null, isActive: true, topic: { slug: { in: topics } } }
    });
    if (available === 0) return jsonError(503, "Bu yo'nalish uchun savollar hozircha tayyor emas");

    const interview = await prisma.interview.create({
      data: {
        candidateName: name,
        track,
        stack,
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
        afterJson: JSON.stringify({ name, track, stack })
      }
    });

    return NextResponse.json({
      interviewId: interview.id,
      track,
      stack,
      question: toServed(q, 1, settings.totalQuestions)
    });
  } catch (err) {
    console.error("Interview start POST error:", err);
    return jsonError(500, "Serverda kutilmagan xatolik yuz berdi. Iltimos qayta urinib ko'ring.");
  }
}
