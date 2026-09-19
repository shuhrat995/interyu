"use client";

import { useRef, useState } from "react";

type Props = { onDone: () => void };

export default function ImportPanel({ onDone }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [mode, setMode] = useState<"append" | "replace">("append");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ total: number; imported: number; errors: { row: number; error: string }[] } | null>(null);
  const [err, setErr] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const file = fileRef.current?.files?.[0];
    if (!file) {
      setErr("Fayl tanlang (CSV yoki JSON)");
      return;
    }
    setErr("");
    setBusy(true);
    setResult(null);
    try {
      const content = await file.text();
      const format = file.name.toLowerCase().endsWith(".json") ? "json" : "csv";
      const res = await fetch("/api/questions/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ format, mode, content })
      });
      const j = await res.json();
      if (!res.ok) {
        setErr(j.error || "Import xatosi");
        return;
      }
      setResult(j);
      onDone();
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="card p-4 space-y-3">
      <h2 className="text-sm font-medium">Import (CSV / JSON)</h2>
      <p className="text-xs text-mut">
        CSV ustunlari: <code>topicSlug, type, difficulty, text, options, correctIndex, rubric, keywords, timeLimit</code>.
        Variantlar va kalit so'zlar <code>|</code> bilan ajratiladi. <code>type</code>: mcq | written.
      </p>
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label className="label" htmlFor="impfile">Fayl</label>
          <input id="impfile" ref={fileRef} type="file" accept=".csv,.json,text/csv,application/json" />
        </div>
        <div>
          <label className="label" htmlFor="impmode">Rejim</label>
          <select id="impmode" value={mode} onChange={(e) => setMode(e.target.value as "append" | "replace")}>
            <option value="append">Qo'shish</option>
            <option value="replace">Almashtirish (eski savollar soft-delete)</option>
          </select>
        </div>
        <button className="btn-primary" disabled={busy}>
          {busy ? "Import qilinmoqda..." : "Import"}
        </button>
      </div>
      {err && <div className="text-sm text-bad">{err}</div>}
      {result && (
        <div className="text-sm space-y-1">
          <div>
            ✅ Import qilindi: <b>{result.imported}</b> / {result.total}
          </div>
          {result.errors.length > 0 && (
            <div className="max-h-40 overflow-y-auto rounded border border-warn/40 bg-warn/10 p-2">
              {result.errors.map((e, i) => (
                <div key={i} className="text-warn text-xs">
                  Qator {e.row}: {e.error}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </form>
  );
}
