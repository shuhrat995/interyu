"use client";

import { useCallback, useEffect, useState } from "react";

type Topic = {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
  color: string;
  order: number;
  isActive: boolean;
  _count?: { questions: number };
};

export default function TopicsPage() {
  const [topics, setTopics] = useState<Topic[]>([]);
  const [form, setForm] = useState({ name: "", slug: "", parentId: "", color: "#6d8cff" });
  const [editId, setEditId] = useState<string | null>(null);
  const [err, setErr] = useState("");

  const load = useCallback(async () => {
    const res = await fetch("/api/topics");
    if (res.ok) setTopics((await res.json()).topics ?? []);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    const payload = {
      name: form.name,
      slug: form.slug || form.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""),
      parentId: form.parentId || null,
      color: form.color
    };
    const res = await fetch(editId ? "/api/topics" : "/api/topics", {
      method: editId ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editId ? { id: editId, patch: payload } : payload)
    });
    const j = await res.json().catch(() => ({}));
    if (!res.ok) {
      setErr(j.error || "Xato");
      return;
    }
    setForm({ name: "", slug: "", parentId: "", color: "#6d8cff" });
    setEditId(null);
    load();
  }

  async function remove(id: string) {
    if (!confirm("Mavzuni o'chirish?")) return;
    const res = await fetch(`/api/topics?id=${id}`, { method: "DELETE" });
    const j = await res.json().catch(() => ({}));
    if (!res.ok) setErr(j.error || "O'chirish xatosi");
    load();
  }

  function startEdit(t: Topic) {
    setEditId(t.id);
    setForm({ name: t.name, slug: t.slug, parentId: t.parentId ?? "", color: t.color });
  }

  const nameOf = (id: string | null) => topics.find((t) => t.id === id)?.name ?? "—";

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Mavzular</h1>
        <p className="text-sm text-mut">Savollar mavzular bo'yicha guruhlanadi (ichma-ich bo'lishi mumkin)</p>
      </div>

      <form onSubmit={save} className="card p-4 grid md:grid-cols-5 gap-3 items-end">
        <div>
          <label className="label" htmlFor="tname">Nomi *</label>
          <input id="tname" className="w-full" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required minLength={2} />
        </div>
        <div>
          <label className="label" htmlFor="tslug">Slug (bo'sh qoldirsa nomdan yasaladi)</label>
          <input id="tslug" className="w-full" value={form.slug} onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))} placeholder="javascript" />
        </div>
        <div>
          <label className="label" htmlFor="tparent">Ota mavzu</label>
          <select id="tparent" className="w-full" value={form.parentId} onChange={(e) => setForm((f) => ({ ...f, parentId: e.target.value }))}>
            <option value="">—</option>
            {topics.filter((t) => t.id !== editId).map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="tcolor">Rang</label>
          <input id="tcolor" type="color" className="w-full h-9 p-1" value={form.color} onChange={(e) => setForm((f) => ({ ...f, color: e.target.value }))} />
        </div>
        <div className="flex gap-2">
          <button className="btn-primary flex-1 justify-center">{editId ? "Saqlash" : "Qo'shish"}</button>
          {editId && (
            <button type="button" className="btn-ghost" onClick={() => { setEditId(null); setForm({ name: "", slug: "", parentId: "", color: "#6d8cff" }); }}>
              Bekor
            </button>
          )}
        </div>
      </form>

      {err && <div className="card p-3 text-sm text-bad">{err}</div>}

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-mut border-b border-line">
              <th className="p-3 font-medium">Nomi</th>
              <th className="p-3 font-medium">Slug</th>
              <th className="p-3 font-medium">Ota mavzu</th>
              <th className="p-3 font-medium">Savollar</th>
              <th className="p-3 font-medium">Holat</th>
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody>
            {topics.map((t) => (
              <tr key={t.id} className="border-b border-line/60">
                <td className="p-3">
                  <span className="badge" style={{ borderColor: t.color, color: t.color }}>{t.name}</span>
                </td>
                <td className="p-3 text-mut">{t.slug}</td>
                <td className="p-3">{t.parentId ? nameOf(t.parentId) : "—"}</td>
                <td className="p-3 tabular-nums">{t._count?.questions ?? 0}</td>
                <td className="p-3">{t.isActive ? <span className="badge border-ok/50 text-ok">Aktiv</span> : <span className="badge border-line text-mut">Nofaol</span>}</td>
                <td className="p-3 text-right whitespace-nowrap">
                  <button className="btn-ghost text-xs mr-1" onClick={() => startEdit(t)}>Tahrir</button>
                  <button className="btn-danger text-xs" onClick={() => remove(t.id)}>O'chir</button>
                </td>
              </tr>
            ))}
            {topics.length === 0 && (
              <tr><td colSpan={6} className="p-6 text-center text-mut">Mavzular yo'q — yuqoridan qo'shing</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
