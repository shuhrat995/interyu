import { z } from "zod";

export const questionInputSchema = z
  .object({
    topicId: z.string().min(1, "Mavzu majburiy"),
    type: z.enum(["mcq", "written"]),
    difficulty: z.number().int().min(0).max(5),
    text: z.string().min(10, "Savol matni kamida 10 belgi").max(2000),
    options: z.array(z.string().min(1, "Variant bo'sh bo'lishi mumkin emas").max(500)).min(2).max(5).optional(),
    correctIndex: z.number().int().min(0).max(4).optional(),
    rubric: z.string().max(4000).optional(),
    keywords: z.array(z.string().min(1).max(40)).max(10, "Kalit so'zlar 10 tadan ko'p bo'lmasin").optional(),
    timeLimit: z.number().int().min(30).max(900).optional()
  })
  .superRefine((q, ctx) => {
    if (q.type === "mcq") {
      if (!q.options || q.options.length < 2) {
        ctx.addIssue({ code: "custom", path: ["options"], message: "MCQ: kamida 2 ta variant kerak" });
      } else if (q.correctIndex === undefined || q.correctIndex >= q.options.length) {
        ctx.addIssue({ code: "custom", path: ["correctIndex"], message: "To'g'ri javob variantlar ichidan tanlanishi kerak" });
      }
    } else {
      if (!q.rubric || q.rubric.trim().length < 30) {
        ctx.addIssue({ code: "custom", path: ["rubric"], message: "Yozma savol uchun rubric kamida 30 belgi" });
      }
    }
  });

export type QuestionInput = z.infer<typeof questionInputSchema>;

export type QuestionDb = {
  topicId: string;
  type: string;
  difficulty: number;
  text: string;
  optionsJson: string | null;
  correctIndex: number | null;
  rubric: string | null;
  keywords: string;
  timeLimit: number;
};

export function toDb(q: QuestionInput): QuestionDb {
  return {
    topicId: q.topicId,
    type: q.type,
    difficulty: q.difficulty,
    text: q.text.trim(),
    optionsJson: q.type === "mcq" ? JSON.stringify(q.options ?? []) : null,
    correctIndex: q.type === "mcq" ? q.correctIndex ?? null : null,
    rubric: q.type === "written" ? (q.rubric ?? "").trim() : null,
    keywords: (q.keywords ?? []).join(","),
    timeLimit: q.timeLimit ?? 180
  };
}

export type QuestionApi = {
  topicId: string;
  type: "mcq" | "written";
  difficulty: number;
  text: string;
  options: string[];
  correctIndex: number | null;
  rubric: string | null;
  keywords: string[];
  timeLimit: number;
};

export function fromDb(row: {
  topicId: string;
  type: string;
  difficulty: number;
  text: string;
  optionsJson: string | null;
  correctIndex: number | null;
  rubric: string | null;
  keywords: string;
  timeLimit: number;
}): QuestionApi {
  let options: string[] = [];
  try {
    options = row.optionsJson ? (JSON.parse(row.optionsJson) as string[]) : [];
  } catch {
    options = [];
  }
  return {
    topicId: row.topicId,
    type: row.type === "mcq" ? "mcq" : "written",
    difficulty: row.difficulty,
    text: row.text,
    options,
    correctIndex: row.correctIndex,
    rubric: row.rubric,
    keywords: row.keywords ? row.keywords.split(",").filter(Boolean) : [],
    timeLimit: row.timeLimit
  };
}
