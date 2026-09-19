import { prisma } from "@/lib/prisma";

export type AIProvider = "gemini" | "openai" | "mock";

export type AICallKind = "evaluate_written" | "final_report" | "rubric" | "keywords" | "distractors";

export type AIResult =
  | { ok: true; provider: AIProvider; data: Record<string, unknown> }
  | { ok: false; error: string };

export type AIOptions = {
  /** Umumiy vaqt byudjeti (ms). Tugasa keyingi modelga o'tiladi yoki xato qaytadi. */
  budgetMs?: number;
  /** Javob uzunligi chegarasi — qisqa javob = tez javob. */
  maxOutputTokens?: number;
};

const GEMINI_URL = (model: string) =>
  `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

const SYSTEM_PROMPT = "Siz tajribali texnik intervyuersiz. Faqat valid JSON qaytaring, izohsiz.";

/** Tez modellar birinchi — 429/5xx bo'lsa keyingisiga o'tiladi (har modelning kvotasi alohida). */
const DEFAULT_MODEL_CHAIN = ["gemini-3.1-flash-lite", "gemini-flash-lite-latest", "gemini-3.6-flash"];

const PER_MODEL_TIMEOUT_MS = 8000;

/** thinkingConfig'ni qo'llab-quvvatlamaydigan modellar (400 javobidan keyin o'rganiladi) */
const noThinkingSupport = new Set<string>();

function modelChain(): string[] {
  const raw = process.env.GEMINI_MODELS?.trim();
  const list = raw && raw.length > 0 ? raw.split(",") : [process.env.GEMINI_MODEL ?? "", ...DEFAULT_MODEL_CHAIN];
  return list.map((m) => m.trim()).filter((m) => m.length > 0).filter((m, i, a) => a.indexOf(m) === i);
}

type LogArgs = {
  provider: AIProvider;
  model: string;
  kind: AICallKind;
  promptChars: number;
  status: "ok" | "error";
  errorText?: string;
  inputTokens?: number | null;
  outputTokens?: number | null;
  latencyMs?: number;
};

/** TZ 4.7.2: har bir AI chaqiruv AICallLog'ga yoziladi (xato bo'lsa ham) */
async function logCall(args: LogArgs): Promise<void> {
  try {
    await prisma.aICallLog.create({
      data: {
        provider: args.provider,
        model: args.model,
        kind: args.kind,
        promptChars: args.promptChars,
        status: args.status,
        errorText: args.errorText ?? null,
        inputTokens: args.inputTokens ?? null,
        outputTokens: args.outputTokens ?? null,
        latencyMs: args.latencyMs ?? null
      }
    });
  } catch {
    // loglash muvaffaqiyatsiz bo'lsa asosiy oqimni buzmaslik kerak
  }
}

type GeminiAttempt =
  | { ok: true; data: Record<string, unknown>; tokens: { input: number; output: number }; latencyMs: number }
  | {
      ok: false;
      error: string;
      latencyMs: number;
      status: number;
      /** 5xx / timeout — bir marta qayta urinishga arziydi */
      retriable: boolean;
      /** 400 + thinkingConfig — shu modelni thinking'siz qayta sinash kerak */
      retryWithoutThinking: boolean;
    };

/**
 * Bitta Gemini modeliga chaqiruv.
 * thinkingBudget: 0 — "o'ylash" o'chirilgan, shuning uchun javob 1-3 soniyada keladi.
 */
async function callGeminiModel(
  model: string,
  kind: AICallKind,
  prompt: string,
  opts: { timeoutMs: number; maxOutputTokens: number }
): Promise<GeminiAttempt> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return { ok: false, error: "GEMINI_API_KEY yo'q", latencyMs: 0, status: 0, retriable: false, retryWithoutThinking: false };

  const useThinking = !noThinkingSupport.has(model);
  const generationConfig: Record<string, unknown> = {
    temperature: 0.2,
    responseMimeType: "application/json",
    maxOutputTokens: opts.maxOutputTokens
  };
  if (useThinking) generationConfig.thinkingConfig = { thinkingBudget: 0 };

  const started = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), opts.timeoutMs);
  try {
    const res = await fetch(GEMINI_URL(model), {
      method: "POST",
      signal: controller.signal,
      headers: { "Content-Type": "application/json", "X-goog-api-key": key },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig
      })
    });
    const latencyMs = Date.now() - started;
    if (!res.ok) {
      const t = await res.text();
      const status = res.status;
      if (status === 400 && useThinking) {
        noThinkingSupport.add(model);
        return {
          ok: false,
          error: `Gemini 400 (thinking'siz qayta urinish): ${t.slice(0, 160)}`,
          latencyMs,
          status,
          retriable: false,
          retryWithoutThinking: true
        };
      }
      return {
        ok: false,
        error: `Gemini ${status}: ${t.slice(0, 200)}`,
        latencyMs,
        status,
        // 429 (kvota) — kutish foydasiz, darhol keyingi modelga o'tamiz
        retriable: status >= 500,
        retryWithoutThinking: false
      };
    }
    const json = (await res.json()) as {
      candidates?: { content?: { parts?: { text?: string }[] } }[];
      usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number };
    };
    const text = json.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
    if (!text) {
      return { ok: false, error: "Gemini bo'sh javob qaytardi", latencyMs, status: 200, retriable: false, retryWithoutThinking: false };
    }
    return {
      ok: true,
      data: JSON.parse(text) as Record<string, unknown>,
      tokens: {
        input: json.usageMetadata?.promptTokenCount ?? 0,
        output: json.usageMetadata?.candidatesTokenCount ?? 0
      },
      latencyMs
    };
  } catch (e) {
    const aborted = e instanceof Error && e.name === "AbortError";
    return {
      ok: false,
      error: aborted ? `Gemini timeout (${opts.timeoutMs}ms)` : e instanceof Error ? e.message : "Gemini chaqiruv xatosi",
      latencyMs: Date.now() - started,
      status: 0,
      retriable: true,
      retryWithoutThinking: false
    };
  } finally {
    clearTimeout(timer);
  }
}

/** OpenAI — Gemini zanjiri ishlamasa (kalit bo'lsa) */
async function callOpenAI(
  prompt: string,
  opts: { timeoutMs: number; maxOutputTokens: number }
): Promise<{ data?: Record<string, unknown>; tokens?: { input: number; output: number }; latencyMs: number; error?: string }> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return { error: "OPENAI_API_KEY yo'q", latencyMs: 0 };
  const model = process.env.OPENAI_MODEL || "gpt-4o-mini";

  const started = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), opts.timeoutMs);
  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      signal: controller.signal,
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model,
        temperature: 0.2,
        max_tokens: opts.maxOutputTokens,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: prompt }
        ]
      })
    });
    const latencyMs = Date.now() - started;
    if (!res.ok) {
      const t = await res.text();
      return { error: `OpenAI ${res.status}: ${t.slice(0, 200)}`, latencyMs };
    }
    const json = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
      usage?: { prompt_tokens?: number; completion_tokens?: number };
    };
    const content = json.choices?.[0]?.message?.content;
    if (!content) return { error: "OpenAI bo'sh javob qaytardi", latencyMs };
    return {
      data: JSON.parse(content) as Record<string, unknown>,
      tokens: { input: json.usage?.prompt_tokens ?? 0, output: json.usage?.completion_tokens ?? 0 },
      latencyMs
    };
  } catch (e) {
    const aborted = e instanceof Error && e.name === "AbortError";
    return {
      error: aborted ? `OpenAI timeout (${opts.timeoutMs}ms)` : e instanceof Error ? e.message : "OpenAI chaqiruv xatosi",
      latencyMs: Date.now() - started
    };
  } finally {
    clearTimeout(timer);
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * AI chaqiruvi: Gemini modellar zanjiri (tez → sekin) → OpenAI → xato.
 *
 * Tezlik siyosati (TZ 4.7.3 — timeout/rate limit qoplanadi):
 *  - thinking o'chirilgan (thinkingBudget: 0) → javob ~1-3s
 *  - 429 (kvota) → kutmasdan darhol keyingi modelga o'tish
 *  - 5xx yoki timeout → bir marta qayta urinish
 *  - umumiy byudjet tugasa — mock/heuristik bahoga o'tiladi (nomzod kutib qolmaydi)
 */
export async function callAI(kind: AICallKind, prompt: string, opts: AIOptions = {}): Promise<AIResult> {
  const promptChars = prompt.length;
  const budgetMs = opts.budgetMs ?? 12000;
  const maxOutputTokens = opts.maxOutputTokens ?? 900;
  const deadline = Date.now() + budgetMs;
  let lastError = "";

  for (const model of modelChain()) {
    for (let attempt = 0; attempt < 2; attempt++) {
      const remaining = deadline - Date.now();
      if (remaining < 1200) {
        lastError ||= "AI vaqt byudjeti tugadi";
        break;
      }
      const r = await callGeminiModel(model, kind, prompt, {
        timeoutMs: Math.min(PER_MODEL_TIMEOUT_MS, remaining),
        maxOutputTokens
      });

      if (r.ok) {
        await logCall({
          provider: "gemini",
          model,
          kind,
          promptChars,
          status: "ok",
          inputTokens: r.tokens.input,
          outputTokens: r.tokens.output,
          latencyMs: r.latencyMs
        });
        return { ok: true, provider: "gemini", data: r.data };
      }

      await logCall({ provider: "gemini", model, kind, promptChars, status: "error", errorText: r.error, latencyMs: r.latencyMs });

      if (r.retryWithoutThinking) continue; // bir xil modelni thinking'siz sinash
      if (r.retriable && attempt === 0 && deadline - Date.now() > 2500) {
        await sleep(300);
        continue;
      }
      lastError = r.error;
      break; // keyingi model
    }
    if (Date.now() >= deadline - 1200) break;
  }

  // OpenAI fallback (faqat byudjet qolgan bo'lsa)
  if (process.env.OPENAI_API_KEY && deadline - Date.now() > 1500) {
    const o = await callOpenAI(prompt, {
      timeoutMs: Math.min(PER_MODEL_TIMEOUT_MS, deadline - Date.now()),
      maxOutputTokens
    });
    const oModel = process.env.OPENAI_MODEL || "gpt-4o-mini";
    if (o.data) {
      await logCall({
        provider: "openai",
        model: oModel,
        kind,
        promptChars,
        status: "ok",
        inputTokens: o.tokens?.input,
        outputTokens: o.tokens?.output,
        latencyMs: o.latencyMs
      });
      return { ok: true, provider: "openai", data: o.data };
    }
    await logCall({ provider: "openai", model: oModel, kind, promptChars, status: "error", errorText: o.error, latencyMs: o.latencyMs });
    lastError ||= o.error ?? "";
  }

  return { ok: false, error: lastError || "AI provider mavjud emas" };
}
