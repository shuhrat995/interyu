import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { jsonError, parseBody, withAuth } from "@/lib/api";
import { aiAssist } from "@/lib/ai";

const schema = z.object({
  kind: z.enum(["rubric", "keywords", "distractors"]),
  text: z.string().min(10).max(2000),
  options: z.array(z.string().max(500)).max(5).optional(),
  difficulty: z.number().int().min(0).max(5).optional(),
  questionId: z.string().optional()
});

export const POST = withAuth(
  async ({ req, session }) => {
    const parsed = await parseBody(req, schema);
    if (!parsed.ok) return parsed.res;
    const { kind, text, options, difficulty, questionId } = parsed.data;

    const result = await aiAssist(kind, { text, options, difficulty });

    if (result.ok) {
      if (questionId) {
        await prisma.auditLog.create({
          data: {
            actorId: session.sub,
            action: `ai_assist_${kind}`,
            entity: "question",
            entityId: questionId,
            afterJson: JSON.stringify({ provider: result.provider })
          }
        });
      }
      return NextResponse.json({ provider: result.provider, data: result.data });
    }
    return jsonError(502, `AI xato: ${result.error}`);
  },
  { perm: "question:create" }
);
