import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { audit, jsonError, withAuth } from "@/lib/api";
import { csvToObjects } from "@/lib/csv";
import { questionInputSchema, toDb } from "@/lib/questionSchema";
import { z } from "zod";

export const POST = withAuth(
  async ({ req, session }) => {
    const schema = z.object({
      format: z.enum(["csv", "json"]),
      mode: z.enum(["append", "replace"]),
      content: z.string().min(1)
    });
    const parsed = schema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return jsonError(422, "Noto'g'ri so'rov");
    const { format, mode, content } = parsed.data;
    const topics = await prisma.topic.findMany();
    const bySlug = new Map(topics.map((t) => [t.slug, t]));
    const byName = new Map(topics.map((t) => [t.name.toLowerCase(), t]));

    type Item = { row: number; raw: Record<string, unknown> };
    const items: Item[] = [];

    if (format === "csv") {
      const rows = csvToObjects(content);
      if (rows.length === 0) return jsonError(422, "CSV bo'sh yoki header yo'q");
      rows.forEach((r, i) => {
        items.push({
          row: i + 2,
          raw: {
            topicSlug: r.topicSlug ?? r.topic ?? "",
            type: r.type,
            difficulty: Number(r.difficulty),
            text: r.text,
            options: r.options ? r.options.split("|") : undefined,
            correctIndex: r.correctIndex === "" ? undefined : Number(r.correctIndex),
            rubric: r.rubric || undefined,
            keywords: r.keywords ? r.keywords.split("|") : [],
            timeLimit: r.timeLimit ? Number(r.timeLimit) : undefined
          }
        });
      });
    } else {
      let arr: unknown[] = [];
      try {
        const v: unknown = JSON.parse(content);
        if (Array.isArray(v)) arr = v;
        else return jsonError(422, "JSON massiv bo'lishi kerak");
      } catch {
        return jsonError(422, "JSON parse xatosi");
      }
      arr.forEach((r, i) => items.push({ row: i + 1, raw: r as Record<string, unknown> }));
    }

    const valid: { row: number; input: import("zod").infer<typeof questionInputSchema> }[] = [];
    const errors: { row: number; error: string }[] = [];
    for (const item of items) {
      const raw = item.raw;
      const slugOrName = String(raw.topicSlug ?? "");
      const topic = bySlug.get(slugOrName) ?? byName.get(slugOrName.toLowerCase());
      if (!topic) {
        errors.push({ row: item.row, error: `Mavzu topilmadi: "${slugOrName}"` });
        continue;
      }
      const check = questionInputSchema.safeParse({ ...raw, topicId: topic.id });
      if (!check.success) {
        const issue = check.error.issues[0];
        errors.push({ row: item.row, error: `${issue.path.join(".")}: ${issue.message}` });
      } else {
        valid.push({ row: item.row, input: check.data });
      }
    }

    let imported = 0;
    await prisma.$transaction(async (tx) => {
      if (mode === "replace") {
        await tx.question.updateMany({ data: { deletedAt: new Date() }, where: { deletedAt: null } });
      }
      for (const v of valid) {
        const q = await tx.question.create({ data: toDb(v.input) });
        await tx.questionVersion.create({
          data: {
            questionId: q.id,
            version: 1,
            action: "create",
            snapshotJson: JSON.stringify(v.input),
            editedById: session.sub
          }
        });
        imported += 1;
      }
    });

    await audit(req, session.sub, "import", "question", null, null, {
      format,
      mode,
      total: items.length,
      imported,
      errorCount: errors.length
    });
    return NextResponse.json({ total: items.length, imported, errors });
  },
  { perm: "question:import" }
);
