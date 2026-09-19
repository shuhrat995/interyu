"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import QuestionForm from "@/components/QuestionForm";
import ImportPanel from "@/components/ImportPanel";

type Topic = { id: string; name: string; color: string; isActive: boolean };
type Row = {
  id: string;
  type: string;
  difficulty: number;
  text: string;
  optionsJson: string | null;
  correctIndex: number | null;
  rubric: string | null;
  keywords: string;
  timeLimit: number;
  isActive: boolean;
  version: number;
  deletedAt: string | null;
  topic: { name: string; color: string } | null;
};

const TYPE_LABEL: Record<string, string> = { mcq: "MCQ", written: "Yozma" };

export default function QuestionsPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [search, setSearch] = useState("");
  const [topicId, setTopicId] = useState("");
  const [type, setType] = useState("");
  const [difficulty, setDifficulty] = useState("");
  const [includeDeleted, setIncludeDeleted] = useState(false);
  const [editing, setEditing] = useState<{ id?: string } | null>(null);
  const [err, setErr] = useState("");
  const pageSize = 20;

  const load = useCallback(async () => {
    const sp = new URLSearchParams({
      page: String(page),
      pageSize: String(pageSize),
      includeDeleted: includeDeleted ? "1" : "0"
    });
    if (search) sp.set("search", search);
    if (topicId) sp.set("topicId", topicId);
    if (type) sp.set("type", type);
    if (difficulty !== "") sp.set("difficulty", difficulty);
    const res = await fetch(`/api/questions?${sp}`);
    if (res.ok) {
      const j = await res.json();
      setRows(j.rows);
      setTotal(j.total);
    }
  }, [page, search, topicId, type, difficulty, includeDeleted]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    fetch("/api/topics")
      .then((r) => r.json())
      .then((j) => setTopics(j.topics ?? []))
      .catch(() => {});
  }, []);

  const pages = Math.max(1, Math.ceil(total / pageSize));

  async function remove(id: string) {
    if (!confirm("Savolni o'chirish? (30 kun ichida tiklash mumkin)")) return;
    const res = await fetch(`/api/questions/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setErr(j.error || "O'chirish xatosi");
      return;
    }
    load();
  }

  async function restore(id: string) {
    await fetch(`/api/questions/${id}`, { method: "POST" });
    load();
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-semibold">Savollar</h1>
          <p className="text-sm text-mut">Jami: {total}</p>
        </div>
        <div className="flex gap-2">
          <button className="btn-ghost" onClick={() => setEditing({})}>
            + Yangi savol
          </button>
          <a className="btn-ghost" href="/api/questions/export?format=csv">CSV eksport</a>
          <a className="btn-ghost" href="/api/questions/export?format=json">JSON eksport</a>
        </div>
      </div>

      {err && <div className="card p-3 text-sm text-bad">{err}</div>}

      <div className="card p-3 grid grid-cols-2 md:grid-cols-6 gap-2 items-end">
        <div className="col-span-2">
          <label className="label" htmlFor="qsearch">Qidiruv</label>
          <input id="qsearch" className="w-full" value={search} onChange={(e) => { setPage(1); setSearch(e.target.value); }} placeholder="matn bo'yicha..." />
        </div>
        <div>
          <label className="label" htmlFor="qtopic">Mavzu</label>
          <select id="qtopic" className="w-full" value={topicId} onChange={(e) => { setPage(1); setTopicId(e.target.value); }}>
            <option value="">Barchasi</option>
            {topics.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="qtype">Tur</label>
          <select id="qtype" className="w-full" value={type} onChange={(e) => { setPage(1); setType(e.target.value); }}>
            <option value="">Barchasi</option>
            <option value="mcq">MCQ</option>
            <option value="written">Yozma</option>
          </select>
        </div>
        <div>
          <label className="label" htmlFor="qdiff">Daraja</label>
          <select id="qdiff" className="w-full" value={difficulty} onChange={(e) => { setPage(1); setDifficulty(e.target.value); }}>
            <option value="">Barchasi</option>
            {[0, 1, 2, 3, 4, 5].map((d) => (
              <option key={d} value={d}>{d}/5</option>
            ))}
          </select>
        </div>
        <label className="flex items-center gap-2 text-sm text-mut pb-2">
          <input type="checkbox" checked={includeDeleted} onChange={(e) => { setPage(1); setIncludeDeleted(e.target.checked); }} />
          O'chirilganlar
        </label>
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-mut border-b border-line">
              <th className="p-3 font-medium">Savol</th>
              <th className="p-3 font-medium">Mavzu</th>
              <th className="p-3 font-medium">Tur</th>
              <th className="p-3 font-medium">Daraja</th>
              <th className="p-3 font-medium">v</th>
              <th className="p-3 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className={`border-b border-line/60 ${r.deletedAt ? "opacity-50" : ""}`}>
                <td className="p-3 max-w-md">
                  <div className="truncate" title={r.text}>{r.text}</div>
                </td>
                <td className="p-3">
                  <span className="badge" style={{ borderColor: r.topic?.color ?? "#273052", color: r.topic?.color ?? "#9aa6cc" }}>
                    {r.topic?.name ?? "—"}
                  </span>
                </td>
                <td className="p-3">{TYPE_LABEL[r.type]}</td>
                <td className="p-3">{r.difficulty}/5</td>
                <td className="p-3 tabular-nums">{r.version}</td>
                <td className="p-3 text-right whitespace-nowrap">
                  {r.deletedAt ? (
                    <button className="btn-ghost text-xs" onClick={() => restore(r.id)}>Tiklash</button>
                  ) : (
                    <>
                      <button className="btn-ghost text-xs mr-1" onClick={() => setEditing({ id: r.id })}>Tahrir</button>
                      <button className="btn-danger text-xs" onClick={() => remove(r.id)}>O'chir</button>
                    </>
                  )}
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} className="p-6 text-center text-mut">Savollar topilmadi</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center gap-2 text-sm">
        <button className="btn-ghost" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>←</button>
        <span className="text-mut">{page} / {pages}</span>
        <button className="btn-ghost" disabled={page >= pages} onClick={() => setPage((p) => p + 1)}>→</button>
      </div>

      <ImportPanel onDone={load} />

      {editing && (
        <QuestionForm
          id={editing.id}
          topics={topics}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            load();
          }}
        />
      )}
    </div>
  );
}
