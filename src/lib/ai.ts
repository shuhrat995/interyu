import { callAI, type AICallKind, type AIProvider } from "@/lib/ai-provider";

export type AssistKind = "rubric" | "keywords" | "distractors";

export type AssistResult =
  | { ok: true; provider: AIProvider; data: Record<string, unknown> }
  | { ok: false; error: string };

function mockKeywords(text: string): string[] {
  const stop = new Set([
    "the", "and", "for", "with", "this", "that", "nima", "uchun", "haqida",
    "qanday", "qandaydir", "bering", "aytib", "bering?", "vа", "va", "yoki",
    "bu", "shu", "bilan", "kerak", "bo'lgan", "qiling"
  ]);
  const words = text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s']/gu, " ")
    .split(/\s+/)
    .filter((w) => w.length > 3 && !stop.has(w));
  return Array.from(new Set(words)).slice(0, 6);
}

function mockResult(kind: AssistKind, text: string, hasOptions: boolean): Record<string, unknown> {
  if (kind === "rubric") {
    const kws = mockKeywords(text);
    return {
      rubric:
        `Baholash mezonlari: (1) javob savol mohiyatini to'g'ri tushunadi va asosiy tushunchalarni` +
        ` (${kws.slice(0, 3).join(", ") || "asosiy tushunchalar"}) aniqlab beradi; ` +
        `(2) izohlar misol yoki sabab bilan asoslangan; (3) chegara holatlari va xavflar eslatilgan; ` +
        `(4) atamalar to'g'ri ishlatilgan, tushunarli tilda yozilgan. ` +
        `Qisqa va mazmunsiz javob past ball oladi.`,
      keywords: kws
    };
  }
  if (kind === "keywords") return { keywords: mockKeywords(text) };
  if (kind === "distractors") {
    if (!hasOptions) return { options: [] };
    const kws = mockKeywords(text);
    const base = kws[0] ?? "tushuncha";
    return {
      options: [
        `${base} faqat katta loyihalarda kerak, kichik loyihalarda uning o'rni yo'q`,
        `${base} avtomatik hal qiladi, shuning uchun alohida o'rganish shart emas`,
        `${base} faqat brauzer tomonida ishlaydi, server bilan bog'liq emas`
      ]
    };
  }
  return {};
}

function promptFor(kind: AssistKind, text: string, options: string[], difficulty: number): string {
  const lang = "O'zbek tilida javob ber.";
  if (kind === "rubric") {
    return `${lang} Quyidagi yozma intervyu savoli uchun baholash rubrici yoz.
Savol darajasi: ${difficulty}/5 (0=boshlang'ich, 5=ekspert).
Savol: """${text}"""
JSON qaytar: {"rubric": "<kamida 30 belgi, aniq mezonlar>", "keywords": ["3-6 kalit so'z"]}`;
  }
  if (kind === "keywords") {
    return `${lang} Quyidagi savol va rubricdan eng muhim 3-8 kalit so'zni ajrat.
Matn: """${text}"""
JSON qaytar: {"keywords": ["..."]}`;
  }
  return `${lang} MCQ savol uchun ${Math.max(2, 5 - options.length)} ta ishonchli noto'g'ri (distraktor) variant taklif qil.
Savol: """${text}"""
Mavjud variantlar: ${JSON.stringify(options)}
Noto'g'ri variantlar mavzuni bilmasa tanlanadigan, lekin mazmunan xato bo'lishi kerak.
JSON qaytar: {"options": ["..."]}`;
}

export async function aiAssist(
  kind: AssistKind,
  opts: { text: string; options?: string[]; difficulty?: number }
): Promise<AssistResult> {
  const prompt = promptFor(kind, opts.text, opts.options ?? [], opts.difficulty ?? 0);
  const res = await callAI(kind as AICallKind, prompt, { budgetMs: 25000, maxOutputTokens: 1200 });
  if (res.ok) return res;

  // AI kalit yo'q yoki xato — mock fallback (faqat kalit umuman yo'q bo'lsa)
  const hasAnyKey = Boolean(process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY);
  if (!hasAnyKey) {
    return { ok: true, provider: "mock", data: mockResult(kind, opts.text, Boolean(opts.options?.length)) };
  }
  return res;
}
