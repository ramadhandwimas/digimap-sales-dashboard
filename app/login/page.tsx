"use client";

import { useState } from "react";
import { Eye, EyeOff, LockKeyhole, UserRound } from "lucide-react";

export default function LoginPage() {
  const [nik, setNik] = useState(""),
    [password, setPassword] = useState(""),
    [show, setShow] = useState(false),
    [loading, setLoading] = useState(false),
    [error, setError] = useState("");

  const login = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ nik, password }),
        }),
        result = await response.json();
      if (!response.ok) throw new Error(result.error || "Login gagal.");
      const next = new URLSearchParams(window.location.search).get("next");
      window.location.href = next?.startsWith("/") ? next : "/";
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Login gagal.");
      setLoading(false);
    }
  };

  return (
    <main className="grid min-h-screen place-items-center bg-gradient-to-br from-slate-950 via-blue-950 to-blue-700 p-5">
      <section className="w-full max-w-md rounded-3xl border border-white/20 bg-white p-6 shadow-2xl sm:p-8">
        <div className="mx-auto grid size-16 place-items-center rounded-2xl bg-blue-600 text-xl font-black text-white shadow-lg">
          M238
        </div>
        <div className="mt-5 text-center">
          <h1 className="text-2xl font-black text-slate-950">
            M238 Dashboard PIM 2
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Masuk menggunakan NIK team M238.
          </p>
        </div>
        <form onSubmit={login} className="mt-7 space-y-4">
          <label className="block">
            <span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500">
              NIK / ID Team
            </span>
            <span className="flex h-12 items-center gap-3 rounded-xl border bg-white px-3 focus-within:ring-2 focus-within:ring-blue-200">
              <UserRound className="size-5 text-slate-400" />
              <input
                value={nik}
                onChange={(event) => setNik(event.target.value)}
                inputMode="numeric"
                autoComplete="username"
                placeholder="Masukkan NIK"
                className="min-w-0 flex-1 bg-transparent outline-none"
              />
            </span>
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500">
              Password
            </span>
            <span className="flex h-12 items-center gap-3 rounded-xl border bg-white px-3 focus-within:ring-2 focus-within:ring-blue-200">
              <LockKeyhole className="size-5 text-slate-400" />
              <input
                type={show ? "text" : "password"}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="current-password"
                placeholder="Masukkan password"
                className="min-w-0 flex-1 bg-transparent outline-none"
              />
              <button
                type="button"
                onClick={() => setShow((value) => !value)}
                aria-label={
                  show ? "Sembunyikan password" : "Tampilkan password"
                }
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"
              >
                {show ? (
                  <EyeOff className="size-5" />
                ) : (
                  <Eye className="size-5" />
                )}
              </button>
            </span>
          </label>
          {error ? (
            <p className="rounded-xl bg-rose-50 p-3 text-sm font-semibold text-rose-700">
              {error}
            </p>
          ) : null}
          <button
            disabled={loading || !nik.trim() || !password}
            className="w-full rounded-xl bg-blue-600 px-4 py-3 font-black text-white shadow-lg shadow-blue-200 transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "Memeriksa…" : "Login"}
          </button>
        </form>
        <p className="mt-6 text-center text-xs text-slate-400">
          Digimap Pondok Indah Mall 2
        </p>
      </section>
    </main>
  );
}
