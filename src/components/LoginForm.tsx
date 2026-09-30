"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

type Mode = "login" | "bootstrap";

/** Turli server javoblaridan o'qish mumkin bo'lgan xato matnini ajratib oladi. */
function errorMessage(payload: unknown, status: number): string {
  const obj = (payload ?? {}) as Record<string, unknown>;
  const err = obj.error;
  if (typeof err === "string" && err) return err;
  if (err && typeof err === "object") {
    const msg = (err as { message?: unknown }).message;
    if (typeof msg === "string" && msg) return msg;
  }
  if (typeof obj.message === "string" && obj.message) return obj.message;
  return `Server xato qaytardi (HTTP ${status})`;
}

export default function LoginForm({ mode = "login" }: { mode?: Mode }) {
  const router = useRouter();
  const [step, setStep] = useState<Mode>(mode);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [busy, setBusy] = useState(false);

  async function api(path: string, body?: unknown) {
    setBusy(true);
    setError("");
    try {
      const res = await fetch(path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: body === undefined ? undefined : JSON.stringify(body)
      });
      // JSON bo'lmagan javob ham bo'lishi mumkin (HTML xato sahifasi, boshqa server)
      const text = await res.text();
      let json: Record<string, unknown> = {};
      try {
        json = text ? (JSON.parse(text) as Record<string, unknown>) : {};
      } catch {
        json = {};
      }
      if (!res.ok) {
        setError(errorMessage(json, res.status));
        return null;
      }
      return json;
    } catch {
      setError("Serverga ulanib bo'lmadi. Brauzer manzili va serverni tekshiring.");
      return null;
    } finally {
      setBusy(false);
    }
  }

  async function submitLogin(e: React.FormEvent) {
    e.preventDefault();
    const j = await api("/api/auth/login", { email, password });
    if (!j) return;
    router.push("/admin");
    router.refresh();
  }

  async function submitBootstrap(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) {
      setError("Parollar mos emas");
      return;
    }
    const j = await api("/api/auth/bootstrap", { email, name, password });
    if (!j) return;
    setInfo("Super admin yaratildi. Endi email va parol bilan kiring.");
    setPassword("");
    setConfirm("");
    setStep("login");
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="card w-full max-w-sm p-6 space-y-4">
        <div>
          <h1 className="text-xl font-semibold">AI Intervyu</h1>
          <p className="text-sm text-mut">
            {step === "bootstrap" ? "Birinchi sozlash" : "Admin panelga kirish"}
          </p>
        </div>

        {error && (
          <div className="rounded-md border border-bad/40 bg-bad/10 px-3 py-2 text-sm text-bad" role="alert">
            {error}
          </div>
        )}
        {info && (
          <div className="rounded-md border border-acc/40 bg-acc/10 px-3 py-2 text-sm text-acc" role="status">
            {info}
          </div>
        )}

        {step === "login" && (
          <form onSubmit={submitLogin} className="space-y-3">
            <div>
              <label className="label" htmlFor="email">Login</label>
              <input id="email" type="text" className="w-full" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="username" />
            </div>
            <div>
              <label className="label" htmlFor="password">Parol</label>
              <input id="password" type="password" className="w-full" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" />
            </div>
            <button className="btn-primary w-full justify-center" disabled={busy}>
              {busy ? "Kirilyapti..." : "Kirish"}
            </button>
          </form>
        )}

        {step === "bootstrap" && (
          <form onSubmit={submitBootstrap} className="space-y-3">
            <p className="text-sm text-mut">
              Baza bo'sh — birinchi super_admin hisobini yarating.
            </p>
            <div>
              <label className="label" htmlFor="bname">Ism</label>
              <input id="bname" className="w-full" value={name} onChange={(e) => setName(e.target.value)} required minLength={2} />
            </div>
            <div>
              <label className="label" htmlFor="bemail">Login</label>
              <input id="bemail" type="text" className="w-full" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="username" />
            </div>
            <div>
              <label className="label" htmlFor="bpass">Parol (min 8)</label>
              <input id="bpass" type="password" className="w-full" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} autoComplete="new-password" />
            </div>
            <div>
              <label className="label" htmlFor="bconfirm">Parolni tasdiqlash</label>
              <input id="bconfirm" type="password" className="w-full" value={confirm} onChange={(e) => setConfirm(e.target.value)} required autoComplete="new-password" />
            </div>
            <button className="btn-primary w-full justify-center" disabled={busy}>
              {busy ? "Yaratilyapti..." : "Super admin yaratish"}
            </button>
          </form>
        )}

        <div className="pt-3 border-t border-line text-center">
          <Link href="/" className="text-xs text-mut hover:text-acc">
            ← Asosiy sahifaga qaytish
          </Link>
        </div>
      </div>
    </div>
  );
}
