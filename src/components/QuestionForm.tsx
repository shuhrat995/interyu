"use client";

import { useEffect, useState } from "react";

type Topic = { id: string; name: string; color: string; isActive: boolean };

type Props = {
  id?: string;
  topics: Topic[];
  onClose: () => void;
  onSaved: () => void;
};

type FormState = {
  topicId: string;
  type: "mcq" | "written";
  difficulty: number;
  text: string;
  options: string[];
  correctIndex: number | null;
  rubric: string;
  keywords: string;
  timeLimit: number;
};

export default function QuestionForm({ id, topics, onClose, onSaved }: Props) {
  const [form, setForm] = useState<FormState>({
    topicId: "",
    type: "mcq",
    difficulty: 0,
    text: "",
    options: ["", "", "", ""],
    correctIndex: null,
    rubric: "",
    keywords: "",
    timeLimit: 180
  });
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [aiBusy, setAiBusy] = useState("");
  const [preview, setPreview] = useState(false);

  useEffect(() => {
    if (!id) return;
    fetch(`/api/questions/${id}`)
      .then((r) => r.json())
      .then((j) => {
        const d = j.question?.data;
        if (!d) return;
        setForm({
          topicId: d.topicId,
          type: d.type,
          difficulty: d.difficulty,
          text: d.text,
          options: Array.from({ length: Math.max(4, d.options.length) }, (_, i) => d.options[i] ?? ""),
          correctIndex: d.correctIndex,
          rubric: d.rubric ?? "",
          keywords: (d.keywords ?? []).join(", "),
          timeLimit: d.timeLimit
        });
      });
  }, [id]);

  function set<K extends keyof FormState>(k: K, v: FormState[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function callAi(kind: "rubric" | "keywords" | "distractors") {
    if (form.text.trim().length < 10) {
      setErr("AI uchun avval savol matnini yozing (kamida 10 belgi)");
      return;
    }
    setAiBusy(kind);
    setErr("");
    try {
      const res = await fetch("/api/questions/assist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind,
          text: form.text,
          options: form.options.filter(Boolean),
          difficulty: form.difficulty,
          questionId: id
        })
      });
      const j = await res.json();
      if (!res.ok) {
        setErr(j.error || "AI xato");
        return;
      }
      const data = j.data ?? {};
      if (kind === "rubric") {
        set("rubric", String(data.rubric ?? ""));
        if (Array.isArray(data.keywords) && data.keywords.length) {
          set("keywords", data.keywords.join(", "));
        }
      } else if (kind === "keywords") {
        if (Array.isArray(data.keywords)) set("keywords", data.keywords.join(", "));
      } else if (kind === "distractors") {
        const extra = (data.options as string[]) ?? [];
        if (extra.length) {
          setForm((f) => {
            const opts = [...f.options];
            let idx = 0;
            for (let i = 0; i < opts.length && idx < extra.length; i++) {
              if (!opts[i]) {
                opts[i] = extra[idx];
                idx++;
              }
            }
            return { ...f, options: opts };
          });
        }
      }
    } finally {
      setAiBusy("");
    }
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    const filled = form.options.map((o) => o.trim());
    if (form.type === "mcq") {
      const nonEmpty = filled.filter(Boolean);
      if (nonEmpty.length < 2) {
        setErr("MCQ: kamida 2 ta to'ldirilgan variant kerak");
        return;
      }
      if (form.correctIndex === null || !filled[form.correctIndex]) {
        setErr("To'g'ri javobni tanlang");
        return;
      }
    } else if (form.rubric.trim().length < 30) {
      setErr("Yozma savol uchun rubric kamida 30 belgi");
      return;
    }
    setBusy(true);
    try {
      const payload = {
        topicId: form.topicId,
        type: form.type,
        difficulty: form.difficulty,
        text: form.text,
        options: form.options.map((o) => o.trim()).filter(Boolean),
        correctIndex: form.correctIndex,
        rubric: form.type === "written" ? form.rubric : undefined,
        keywords: form.keywords.split(",").map((k) => k.trim()).filter(Boolean),
        timeLimit: form.timeLimit
      };
      const res = await fetch(id ? `/api/questions/${id}` : "/api/questions", {
        method: id ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErr(j.error || "Saqlash xatosi");
        return;
      }
      onSaved();
    } finally {
      setBusy(false);
    }
  }

  const filledOptions = form.options.map((o) => o.trim()).filter(Boolean);

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-start justify-center overflow-y-auto p-4">
      <form onSubmit={save} className="card w-full max-w-3xl p-5 space-y-4 my-8">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">{id ? "Savolni tahrirlash" : "Yangi savol"}</h2>
          <div className="flex gap-2">
            <button type="button" className="btn-ghost text-xs" onClick={() => setPreview((v) => !v)}>
              {preview ? "Tahrirlash" : "Preview"}
            </button>
            <button type="button" className="btn-ghost text-xs" onClick={onClose}>✕</button>
          </div>
        </div>

        {err && <div className="rounded-md border border-bad/40 bg-bad/10 px-3 py-2 text-sm text-bad">{err}</div>}

        {preview ? (
          <div className="space-y-3">
            <div className="text-xs text-mut">{form.topicId ? topics.find((t) => t.id === form.topicId)?.name : "mavzu tanlanmagan"} · {form.type === "mcq" ? "MCQ" : "Yozma"} · {form.difficulty}/5 · {form.timeLimit}s</div>
            <div className="font-medium">{form.text || "— savol matni bo'sh —"}</div>
            {form.type === "mcq" ? (
              <ol className="space-y-1.5 text-sm">
                {filledOptions.map((o, i) => (
                  <li key={i} className={`px-3 py-2 rounded-md border ${i === form.correctIndex ? "border-ok/60 bg-ok/10" : "border-line"}`}>
                    <b>{"ABCDE"[i]}.</b> {o}
                  </li>
                ))}
              </ol>
            ) : (
              <div className="rounded-md border border-line p-3 text-sm">
                <div className="text-xs text-mut mb-1">Rubric</div>
                <div className="whitespace-pre-wrap">{form.rubric || "—"}</div>
                {form.keywords && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {form.keywords.split(",").map((k) => k.trim()).filter(Boolean).map((k) => (
                      <span key={k} className="badge border-line text-mut">{k}</span>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="grid md:grid-cols-3 gap-3">
            <div>
              <label className="label" htmlFor="ftopic">Mavzu *</label>
              <select id="ftopic" className="w-full" value={form.topicId} onChange={(e) => set("topicId", e.target.value)} required>
                <option value="">Tanlang...</option>
                {topics.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label" htmlFor="ftype">Tur *</label>
              <select id="ftype" className="w-full" value={form.type} onChange={(e) => { set("type", e.target.value as "mcq" | "written"); set("correctIndex", null); }}>
                <option value="mcq">MCQ</option>
                <option value="written">Yozma</option>
              </select>
            </div>
            <div>
              <label className="label" htmlFor="fdiff">Daraja: {form.difficulty}/5</label>
              <input id="fdiff" type="range" min={0} max={5} step={1} className="w-full" value={form.difficulty} onChange={(e) => set("difficulty", Number(e.target.value))} />
            </div>
          </div>
        )}

        {!preview && (
          <>
            <div>
              <label className="label" htmlFor="ftext">Savol matni * (10–2000 belgi)</label>
              <textarea id="ftext" className="w-full" rows={3} maxLength={2000} value={form.text} onChange={(e) => set("text", e.target.value)} required />
              <div className="text-xs text-mut text-right">{form.text.length}/2000</div>
            </div>

            {form.type === "mcq" ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="label mb-0">Variantlar (2–5) va to'g'ri javob *</span>
                  <button type="button" className="btn-ghost text-xs" disabled={Boolean(aiBusy) || filledOptions.length === 0} onClick={() => callAi("distractors")}>
                    {aiBusy === "distractors" ? "AI yozmoqda..." : "🤖 Variant taklif qil"}
                  </button>
                </div>
                {form.options.map((o, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <label className="flex items-center gap-1.5 text-xs cursor-pointer" title="To'g'ri javob">
                      <input
                        type="radio"
                        name="correct"
                        checked={form.correctIndex === i}
                        onChange={() => set("correctIndex", i)}
                        disabled={!o.trim()}
                      />
                      <b>{"ABCDE"[i]}</b>
                    </label>
                    <input
                      className="flex-1"
                      value={o}
                      onChange={(e) => {
                        const v = e.target.value;
                        setForm((f) => {
                          const opts = [...f.options];
                          opts[i] = v;
                          return { ...f, options: opts };
                        });
                      }}
                      placeholder={`${"ABCDE"[i]} variant matni`}
                    />
                    {form.options.length > 2 && (
                      <button
                        type="button"
                        className="btn-ghost text-xs"
                        onClick={() =>
                          setForm((f) => {
                            const opts = f.options.filter((_, idx) => idx !== i);
                            return { ...f, options: opts, correctIndex: null };
                          })
                        }
                        aria-label={`${"ABCDE"[i]} variantni o'chirish`}
                      >
                        ✕
                      </button>
                    )}
                  </div>
                ))}
                {form.options.length < 5 && (
                  <button
                    type="button"
                    className="btn-ghost text-xs"
                    onClick={() => setForm((f) => ({ ...f, options: [...f.options, ""] }))}
                  >
                    + Variant
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="label mb-0">Rubric * (min 30 belgi)</span>
                  <div className="flex gap-1">
                    <button type="button" className="btn-ghost text-xs" disabled={Boolean(aiBusy)} onClick={() => callAi("rubric")}>
                      {aiBusy === "rubric" ? "AI yozmoqda..." : "🤖 Rubric yozib ber"}
                    </button>
                    <button type="button" className="btn-ghost text-xs" disabled={Boolean(aiBusy) || !form.rubric} onClick={() => callAi("keywords")}>
                      {aiBusy === "keywords" ? "AI izlamoqda..." : "🤖 Kalit so'zlar"}
                    </button>
                  </div>
                </div>
                <textarea id="frubric" className="w-full" rows={4} value={form.rubric} onChange={(e) => set("rubric", e.target.value)} />
                <div className="text-xs text-mut text-right">{form.rubric.trim().length} belgi (min 30)</div>
                <div>
                  <label className="label" htmlFor="fkeys">Kalit so'zlar (vergul bilan, 0–10)</label>
                  <input id="fkeys" className="w-full" value={form.keywords} onChange={(e) => set("keywords", e.target.value)} placeholder="promise, event loop, microtask" />
                </div>
              </div>
            )}

            <div className="grid md:grid-cols-2 gap-3">
              <div>
                <label className="label" htmlFor="ftime">Vaqt limiti: {form.timeLimit}s (30–900)</label>
                <input id="ftime" type="range" min={30} max={900} step={10} className="w-full" value={form.timeLimit} onChange={(e) => set("timeLimit", Number(e.target.value))} />
              </div>
            </div>
          </>
        )}

        <div className="flex justify-end gap-2 pt-2 border-t border-line">
          <button type="button" className="btn-ghost" onClick={onClose}>Bekor</button>
          <button className="btn-primary" disabled={busy}>
            {busy ? "Saqlanmoqda..." : "Saqlash"}
          </button>
        </div>
      </form>
    </div>
  );
}
