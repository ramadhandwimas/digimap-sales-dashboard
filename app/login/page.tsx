"use client";

import { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  Eye,
  EyeOff,
  LockKeyhole,
  Check,
  ShieldCheck,
  UserRound,
} from "lucide-react";

const stars = [
  [8, 14, 1.6, 0.1],
  [15, 31, 1.1, 1.3],
  [22, 8, 1.4, 2.2],
  [30, 22, 1.8, 0.8],
  [38, 10, 1.1, 1.7],
  [45, 28, 1.5, 0.4],
  [53, 13, 1.8, 2.6],
  [61, 30, 1.2, 1.1],
  [70, 9, 1.6, 0.2],
  [78, 24, 1.2, 2.1],
  [88, 12, 1.8, 1.4],
  [94, 33, 1.1, 0.7],
  [6, 52, 1.2, 2.4],
  [17, 68, 1.7, 0.5],
  [28, 47, 1.1, 1.6],
  [36, 74, 1.5, 2.8],
  [48, 56, 1.2, 0.9],
  [58, 72, 1.8, 1.8],
  [67, 50, 1.1, 0.3],
  [76, 66, 1.6, 2.5],
  [86, 48, 1.3, 1.2],
  [93, 76, 1.8, 0.6],
  [11, 89, 1.4, 1.9],
  [24, 84, 1.1, 0.4],
  [42, 91, 1.7, 2.2],
  [63, 86, 1.2, 1.1],
  [81, 92, 1.6, 2.7],
] as const;

export default function LoginPage() {
  const [nik, setNik] = useState(""),
    [password, setPassword] = useState(""),
    [show, setShow] = useState(false),
    [introDone, setIntroDone] = useState(false),
    [loading, setLoading] = useState(false),
    [success, setSuccess] = useState(false),
    [statusText, setStatusText] = useState(""),
    [error, setError] = useState(""),
    cardRef = useRef<HTMLElement>(null),
    sceneRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      setIntroDone(true);
      return;
    }

    const timer = window.setTimeout(() => {
      setIntroDone(true);
      sessionStorage.setItem("m238-login-intro-seen", "1");
    }, 1950);

    return () => window.clearTimeout(timer);
  }, []);

  const login = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setSuccess(false);
    setStatusText("Signing you in…");
    setError("");
    try {
      const response = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ nik: nik.trim(), password }),
        }),
        result = await response
          .json()
          .catch(() => ({ error: "Login gagal. Silakan coba lagi." }));

      if (!response.ok) throw new Error(result.error || "Login gagal.");

      setSuccess(true);
      setLoading(false);
      setStatusText("Welcome back!");
      window.setTimeout(() => window.location.replace("/"), 900);
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : "Login gagal.";
      setError(
        /expected pattern|string did not match/i.test(message)
          ? "Login berhasil diproses, tetapi browser gagal membuka dashboard. Silakan coba lagi."
          : message,
      );
      setLoading(false);
      setStatusText("");
    }
  };

  const moveScene = (event: React.PointerEvent<HTMLElement>) => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const scene = sceneRef.current;
    if (!scene) return;
    const rect = scene.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width - 0.5;
    const y = (event.clientY - rect.top) / rect.height - 0.5;
    scene.style.setProperty("--scene-back-x", `${(-x * 3).toFixed(2)}px`);
    scene.style.setProperty("--scene-back-y", `${(-y * 2).toFixed(2)}px`);
    scene.style.setProperty("--scene-mid-x", `${(-x * 6).toFixed(2)}px`);
    scene.style.setProperty("--scene-mid-y", `${(-y * 4).toFixed(2)}px`);
    scene.style.setProperty("--scene-front-x", `${(x * 5).toFixed(2)}px`);
    scene.style.setProperty("--scene-front-y", `${(y * 3.5).toFixed(2)}px`);
  };

  const resetScene = () => {
    const scene = sceneRef.current;
    if (!scene) return;
    scene.style.setProperty("--scene-back-x", "0px");
    scene.style.setProperty("--scene-back-y", "0px");
    scene.style.setProperty("--scene-mid-x", "0px");
    scene.style.setProperty("--scene-mid-y", "0px");
    scene.style.setProperty("--scene-front-x", "0px");
    scene.style.setProperty("--scene-front-y", "0px");
  };

  const tilt = (event: React.PointerEvent<HTMLElement>) => {
    if (
      window.matchMedia("(max-width: 767px)").matches ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    )
      return;

    const element = cardRef.current;
    if (!element) return;

    const rect = element.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width - 0.5;
    const y = (event.clientY - rect.top) / rect.height - 0.5;

    element.style.setProperty("--rotate-x", `${(-y * 5.5).toFixed(2)}deg`);
    element.style.setProperty("--rotate-y", `${(x * 7).toFixed(2)}deg`);
    element.style.setProperty("--glow-x", `${((x + 0.5) * 100).toFixed(1)}%`);
    element.style.setProperty("--glow-y", `${((y + 0.5) * 100).toFixed(1)}%`);
  };

  const resetTilt = () => {
    const element = cardRef.current;
    if (!element) return;
    element.style.setProperty("--rotate-x", "0deg");
    element.style.setProperty("--rotate-y", "0deg");
    element.style.setProperty("--glow-x", "50%");
    element.style.setProperty("--glow-y", "35%");
  };

  return (
    <main
      ref={sceneRef}
      onPointerMove={moveScene}
      onPointerLeave={resetScene}
      className="m238-login relative grid min-h-[100svh] overflow-hidden bg-[#030712] px-5 py-8 text-white sm:px-8"
    >
      {!introDone ? (
        <div className="login-door-intro absolute inset-0 z-[60] overflow-hidden bg-[#020611]">
          <div className="login-door-camera absolute inset-0">
            <div className="login-door-glow absolute left-1/2 top-1/2 h-[78vh] w-[62vw] max-w-[760px] -translate-x-1/2 -translate-y-1/2 rounded-[34px]" />
            <div className="login-door-frame absolute left-1/2 top-1/2 h-[72vh] w-[52vw] max-w-[650px] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-[30px] border border-blue-200/25 shadow-[0_0_80px_rgba(59,130,246,.22)]">
              <div className="login-door-space absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(72,113,255,.52),rgba(10,18,42,.94)_58%,#050914_100%)]" />
              <div className="login-door-grid absolute inset-0 opacity-25" />
              <div className="login-door-panel login-door-left absolute inset-y-0 left-0 w-1/2 border-r border-white/10 bg-[linear-gradient(135deg,#11192b,#09111f)]">
                <div className="login-door-line absolute inset-y-[8%] right-5 w-px bg-gradient-to-b from-transparent via-blue-300/45 to-transparent" />
              </div>
              <div className="login-door-panel login-door-right absolute inset-y-0 right-0 w-1/2 border-l border-white/10 bg-[linear-gradient(225deg,#11192b,#09111f)]">
                <div className="login-door-line absolute inset-y-[8%] left-5 w-px bg-gradient-to-b from-transparent via-violet-300/45 to-transparent" />
              </div>
              <div className="login-door-logo absolute left-1/2 top-1/2 z-20 -translate-x-1/2 -translate-y-1/2 text-center">
                <div className="text-[34px] font-black tracking-[-.055em] text-white sm:text-[46px]">M238</div>
                <div className="mt-2 text-[10px] font-bold uppercase tracking-[.34em] text-blue-200/75">PIM 2</div>
              </div>
            </div>
            <div className="login-door-floor absolute bottom-[-18vh] left-1/2 h-[42vh] w-[120vw] -translate-x-1/2 bg-[radial-gradient(ellipse_at_top,rgba(49,86,255,.22),transparent_64%)]" />
          </div>
        </div>
      ) : null}

      <div aria-hidden className="absolute inset-0">
        <div className="login-grid login-parallax-back absolute inset-0 opacity-20" />
        <div className="login-vignette absolute inset-0" />
        <div className="login-aurora login-aurora-one login-parallax-mid absolute -left-[18vw] -top-[22vw] h-[70vw] w-[70vw] rounded-full" />
        <div className="login-aurora login-aurora-two login-parallax-mid absolute -bottom-[30vw] -right-[18vw] h-[75vw] w-[75vw] rounded-full" />
        <div className="login-orbit login-parallax-front absolute left-1/2 top-[42%] h-[560px] w-[560px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-blue-300/10" />
        <div className="login-orbit login-orbit-two login-parallax-front absolute left-1/2 top-[42%] h-[410px] w-[410px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-violet-300/10" />
        <div className="login-core absolute left-1/2 top-[42%] h-56 w-56 -translate-x-1/2 -translate-y-1/2 rounded-full" />
        {stars.map(([left, top, size, delay], index) => (
          <span
            key={index}
            className="login-star absolute rounded-full bg-white"
            style={{
              left: `${left}%`,
              top: `${top}%`,
              width: size,
              height: size,
              animationDelay: `${delay}s`,
            }}
          />
        ))}

        <span aria-hidden className="login-floating-block login-block-a"><i /></span>
        <span aria-hidden className="login-floating-block login-block-b"><i /><i /></span>
        <span aria-hidden className="login-floating-block login-block-c"><i /></span>
        <span aria-hidden className="login-floating-block login-block-d"><i /><i /></span>
      </div>

      <div className={`relative z-10 m-auto flex w-full max-w-[460px] flex-col items-center transition-opacity duration-300 ${introDone ? "opacity-100" : "pointer-events-none opacity-0"}`}>
        <div className="login-brand-lockup mb-7 flex flex-col items-center text-center sm:mb-8">
          <div className="leading-none">
            <div className="text-[42px] font-black tracking-[-0.065em] text-white sm:text-[48px]">
              digimap
            </div>
            <div className="-mt-1 flex items-baseline justify-center gap-1">
              <span className="text-[10px] font-medium text-slate-300">by</span>
              <span className="font-serif text-[21px] font-black italic tracking-[-0.04em] text-red-500">MAP</span>
            </div>
          </div>
          <div className="mt-3 h-px w-28 bg-gradient-to-r from-transparent via-white/45 to-transparent" />
          <p className="mt-3 text-[10px] font-extrabold uppercase tracking-[0.34em] text-blue-200/80">
            M238 · PIM 2
          </p>
        </div>

        <section
          ref={cardRef}
          onPointerMove={tilt}
          onPointerLeave={resetTilt}
          className="login-card login-card-enter relative w-full overflow-hidden rounded-[30px] border border-white/[0.16] bg-white/[0.075] p-[1px] shadow-[0_32px_90px_rgba(0,0,0,.48)] backdrop-blur-[28px]"
        >
          <div aria-hidden className="login-card-glow absolute inset-0 opacity-70" />
          <div className="relative rounded-[29px] bg-[#08101f]/65 px-6 py-7 sm:px-8 sm:py-8">
            <div className="login-stage login-stage-1 mb-7 text-center">
              <h1 className="text-[28px] font-black tracking-[-0.045em] text-white sm:text-[32px]">
                Welcome Back
              </h1>
              <p className="mt-2 text-sm leading-6 text-slate-300/70">
                Sign in to access M238 Dashboard
              </p>
            </div>

            <form onSubmit={login} className="login-stage login-stage-2 space-y-4">
              <label className="block">
                <span className="mb-2 block text-[11px] font-bold uppercase tracking-[0.16em] text-slate-300/70">
                  NIK / ID Team
                </span>
                <span className="login-field flex h-[54px] items-center gap-3 rounded-2xl border border-white/[0.11] bg-white/[0.055] px-4 transition focus-within:border-blue-300/45 focus-within:bg-white/[0.08] focus-within:ring-4 focus-within:ring-blue-500/10">
                  <UserRound className="size-[18px] shrink-0 text-blue-200/65" />
                  <input
                    value={nik}
                    onChange={(event) => setNik(event.target.value)}
                    inputMode="numeric"
                    autoComplete="username"
                    autoCapitalize="none"
                    spellCheck={false}
                    placeholder="Masukkan NIK"
                    className="min-w-0 flex-1 bg-transparent text-[15px] font-semibold text-white outline-none placeholder:font-medium placeholder:text-slate-500"
                  />
                </span>
              </label>

              <label className="block">
                <span className="mb-2 block text-[11px] font-bold uppercase tracking-[0.16em] text-slate-300/70">
                  Password
                </span>
                <span className="login-field flex h-[54px] items-center gap-3 rounded-2xl border border-white/[0.11] bg-white/[0.055] px-4 transition focus-within:border-blue-300/45 focus-within:bg-white/[0.08] focus-within:ring-4 focus-within:ring-blue-500/10">
                  <LockKeyhole className="size-[18px] shrink-0 text-blue-200/65" />
                  <input
                    type={show ? "text" : "password"}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    autoComplete="current-password"
                    placeholder="Masukkan password"
                    className="min-w-0 flex-1 bg-transparent text-[15px] font-semibold text-white outline-none placeholder:font-medium placeholder:text-slate-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShow((value) => !value)}
                    aria-label={
                      show ? "Sembunyikan password" : "Tampilkan password"
                    }
                    className="grid size-9 shrink-0 place-items-center rounded-xl text-slate-400 transition hover:bg-white/[0.08] hover:text-white"
                  >
                    {show ? (
                      <EyeOff className="size-[18px]" />
                    ) : (
                      <Eye className="size-[18px]" />
                    )}
                  </button>
                </span>
              </label>

              {error ? (
                <div
                  role="alert"
                  className="rounded-2xl border border-rose-300/15 bg-rose-400/[0.09] px-4 py-3 text-sm font-semibold leading-5 text-rose-100"
                >
                  {error}
                </div>
              ) : null}

              <button
                disabled={loading || success || !nik.trim() || !password}
                className={`login-button group relative mt-2 flex h-[54px] w-full items-center justify-center gap-2 overflow-hidden rounded-2xl px-4 text-sm font-black text-white transition duration-300 disabled:cursor-not-allowed disabled:hover:translate-y-0 ${success ? "login-success bg-[#22c989] shadow-[0_15px_34px_rgba(34,201,137,.28)]" : "bg-gradient-to-r from-[#2859ff] via-[#5568ff] to-[#885df7] shadow-[0_15px_34px_rgba(74,88,255,.32)] hover:-translate-y-0.5 hover:shadow-[0_18px_38px_rgba(74,88,255,.42)] disabled:opacity-45"}`}
              >
                <span className="login-button-shine absolute inset-y-0 -left-1/2 w-1/3 skew-x-[-18deg] bg-white/20 blur-md transition-all duration-700 group-hover:left-[120%]" />
                <span className="relative">
                  {success ? "Berhasil" : loading ? "Memeriksa…" : "Sign In"}
                </span>
                {success ? (
                  <Check className="relative size-5 login-check" />
                ) : !loading ? (
                  <ArrowRight className="relative size-4 transition-transform duration-300 group-hover:translate-x-1" />
                ) : (
                  <span className="relative size-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                )}
              </button>
              <div
                aria-live="polite"
                className={`login-status h-5 text-center text-[11px] font-semibold transition ${success ? "text-emerald-300" : "text-slate-400/80"}`}
              >
                {statusText}
              </div>
            </form>

            <div className="mt-6 flex items-center justify-center gap-2 border-t border-white/[0.08] pt-5 text-[11px] font-medium text-slate-400/80">
              <ShieldCheck className="size-3.5 text-emerald-300/75" />
              Secure access for M238 team
            </div>
          </div>
        </section>

        <p className="mt-6 text-center text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500/80">
          M238 · Pondok Indah Mall 2 <span className="mx-2 text-slate-700">·</span> Bron Tampan
        </p>
      </div>

      <style>{`
        .m238-login {
          --scene-back-x: 0px;
          --scene-back-y: 0px;
          --scene-mid-x: 0px;
          --scene-mid-y: 0px;
          --scene-front-x: 0px;
          --scene-front-y: 0px;
          isolation: isolate;
          background:
            radial-gradient(circle at 50% 30%, rgba(58, 96, 246, 0.15), transparent 32%),
            linear-gradient(145deg, #02050d 0%, #071022 52%, #090719 100%);
        }

        .login-door-intro {
          perspective: 1400px;
          animation: introFadeOut 260ms ease 1.72s both;
        }

        .login-door-camera {
          transform-origin: 50% 50%;
          animation: doorCameraPush 1.9s cubic-bezier(.18,.78,.22,1) both;
          will-change: transform, filter;
        }

        .login-door-glow {
          background:
            radial-gradient(circle at center, rgba(83,123,255,.32), rgba(63,76,255,.09) 44%, transparent 72%);
          filter: blur(28px);
          animation: doorGlow 1.55s ease-in-out both;
        }

        .login-door-frame {
          transform-style: preserve-3d;
          background: #07101f;
        }

        .login-door-grid {
          background-image:
            linear-gradient(rgba(255,255,255,.035) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,.035) 1px, transparent 1px);
          background-size: 36px 36px;
          transform: perspective(520px) rotateX(64deg) scale(1.5) translateY(26%);
          transform-origin: bottom;
        }

        .login-door-panel {
          transform-style: preserve-3d;
          backface-visibility: hidden;
          box-shadow:
            inset 0 0 40px rgba(255,255,255,.025),
            0 0 28px rgba(0,0,0,.45);
        }

        .login-door-left {
          transform-origin: left center;
          animation: doorOpenLeft 1.22s cubic-bezier(.2,.82,.22,1) .42s both;
        }

        .login-door-right {
          transform-origin: right center;
          animation: doorOpenRight 1.22s cubic-bezier(.2,.82,.22,1) .42s both;
        }

        .login-door-logo {
          animation: doorLogoOut 780ms ease .35s both;
          text-shadow: 0 0 24px rgba(103,142,255,.46);
        }

        .login-door-floor {
          filter: blur(10px);
          animation: floorRush 1.8s cubic-bezier(.2,.8,.2,1) both;
        }

        @keyframes doorOpenLeft {
          0%, 20% { transform: rotateY(0deg) translateX(0); }
          100% { transform: rotateY(-78deg) translateX(-7%); }
        }

        @keyframes doorOpenRight {
          0%, 20% { transform: rotateY(0deg) translateX(0); }
          100% { transform: rotateY(78deg) translateX(7%); }
        }

        @keyframes doorCameraPush {
          0% { transform: translateZ(0) scale(.94); filter: brightness(.9); }
          38% { transform: translateZ(0) scale(1); filter: brightness(1); }
          100% { transform: translateZ(0) scale(2.45); filter: brightness(1.18); }
        }

        @keyframes doorLogoOut {
          0%, 42% { opacity: 1; transform: translate(-50%,-50%) scale(1); }
          100% { opacity: 0; transform: translate(-50%,-50%) scale(.82); }
        }

        @keyframes doorGlow {
          0% { opacity: .25; transform: translate(-50%,-50%) scale(.82); }
          100% { opacity: .9; transform: translate(-50%,-50%) scale(1.18); }
        }

        @keyframes floorRush {
          from { transform: translateX(-50%) scaleY(.72); opacity: .35; }
          to { transform: translateX(-50%) scaleY(1.35); opacity: .75; }
        }

        @keyframes introFadeOut {
          from { opacity: 1; }
          to { opacity: 0; }
        }

        .login-parallax-back {
          transform: translate3d(var(--scene-back-x), var(--scene-back-y), 0);
          transition: transform 180ms ease-out;
          will-change: transform;
        }

        .login-parallax-mid {
          translate: var(--scene-mid-x) var(--scene-mid-y);
          transition: translate 180ms ease-out;
          will-change: translate;
        }

        .login-parallax-front {
          margin-left: var(--scene-front-x);
          margin-top: var(--scene-front-y);
          transition: margin 180ms ease-out;
        }

        .login-grid {
          background-image:
            linear-gradient(rgba(255,255,255,.028) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,.028) 1px, transparent 1px);
          background-size: 42px 42px;
          mask-image: linear-gradient(to bottom, transparent, #000 22%, #000 78%, transparent);
        }

        .login-vignette {
          background: radial-gradient(circle at center, transparent 24%, rgba(2,6,23,.28) 58%, rgba(2,6,23,.9) 100%);
        }

        .login-aurora {
          filter: blur(56px);
          opacity: .42;
          will-change: transform;
        }

        .login-aurora-one {
          background: radial-gradient(circle, rgba(33,105,255,.74) 0%, rgba(74,46,255,.3) 34%, transparent 70%);
          animation: auroraOne 10s ease-in-out infinite alternate;
        }

        .login-aurora-two {
          background: radial-gradient(circle, rgba(132,72,255,.6) 0%, rgba(24,143,255,.22) 38%, transparent 70%);
          animation: auroraTwo 12s ease-in-out infinite alternate;
        }

        .login-core {
          background:
            radial-gradient(circle at 37% 32%, rgba(255,255,255,.68) 0 1.5%, transparent 2.5%),
            radial-gradient(circle at 50% 45%, rgba(94,155,255,.5), rgba(76,69,255,.13) 42%, transparent 70%);
          filter: blur(.2px);
          box-shadow: 0 0 80px rgba(68,103,255,.2);
          opacity: .34;
          animation: coreFloat 7s ease-in-out infinite;
        }

        .login-orbit {
          box-shadow: 0 0 90px rgba(75,113,255,.05), inset 0 0 80px rgba(75,113,255,.025);
          animation: orbit 18s linear infinite;
        }

        .login-orbit-two {
          animation-direction: reverse;
          animation-duration: 14s;
        }

        .login-orbit::before,
        .login-orbit-two::after {
          content: "";
          position: absolute;
          width: 7px;
          height: 7px;
          border-radius: 999px;
          background: rgba(155,183,255,.9);
          box-shadow: 0 0 18px rgba(118,151,255,.9);
          top: -4px;
          left: 50%;
        }

        .login-star {
          opacity: .25;
          box-shadow: 0 0 8px rgba(255,255,255,.65);
          animation: twinkle 3.2s ease-in-out infinite;
        }
        .login-floating-block {
          position: absolute;
          width: 42px;
          height: 42px;
          border-radius: 11px;
          background: linear-gradient(145deg, rgba(86,159,255,.92), rgba(76,94,255,.72));
          border: 1px solid rgba(255,255,255,.20);
          box-shadow:
            inset 0 2px 0 rgba(255,255,255,.28),
            inset 0 -5px 10px rgba(17,32,92,.22),
            0 16px 34px rgba(25,62,170,.24);
          opacity: .72;
          filter: saturate(.94);
          animation: blockDrift 12s ease-in-out infinite alternate;
          will-change: transform;
        }

        .login-floating-block i {
          position: absolute;
          top: -7px;
          left: 9px;
          width: 12px;
          height: 9px;
          border-radius: 999px 999px 5px 5px;
          background: rgba(112,177,255,.95);
          box-shadow: inset 0 1px 0 rgba(255,255,255,.38);
        }

        .login-floating-block i + i {
          left: 24px;
        }

        .login-block-a {
          left: 8%;
          top: 62%;
          background: linear-gradient(145deg, rgba(255,216,77,.94), rgba(255,159,67,.78));
          animation-duration: 13s;
        }

        .login-block-b {
          left: 82%;
          top: 18%;
          width: 34px;
          height: 34px;
          transform: rotate(14deg);
          animation-delay: -4s;
          animation-duration: 15s;
        }

        .login-block-c {
          right: 8%;
          bottom: 14%;
          width: 54px;
          height: 44px;
          background: linear-gradient(145deg, rgba(77,226,180,.9), rgba(47,184,160,.72));
          animation-delay: -7s;
          animation-duration: 17s;
        }

        .login-block-d {
          left: 18%;
          bottom: 9%;
          width: 30px;
          height: 30px;
          background: linear-gradient(145deg, rgba(255,98,98,.92), rgba(210,72,115,.72));
          animation-delay: -9s;
          animation-duration: 14s;
        }

        @keyframes blockDrift {
          0% {
            transform: translate3d(-4px, 8px, 0) rotate(-5deg);
          }
          45% {
            transform: translate3d(8px, -7px, 0) rotate(3deg);
          }
          100% {
            transform: translate3d(15px, 5px, 0) rotate(7deg);
          }
        }

        .login-brand-lockup {
          animation: brandEnter 520ms cubic-bezier(.16,1,.3,1) both;
        }

        @keyframes brandEnter {
          from { opacity: 0; transform: translateY(-8px) scale(.97); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }

        .login-status {
          transform: translateY(0);
        }

        .login-success + .login-status {
          animation: loginStatusIn 260ms ease both;
        }

        @keyframes loginStatusIn {
          from { opacity: 0; transform: translateY(-3px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .login-brand {
          box-shadow:
            inset 0 1px 0 rgba(255,255,255,.16),
            0 18px 50px rgba(17,42,126,.3);
        }

        .login-card {
          --rotate-x: 0deg;
          --rotate-y: 0deg;
          --glow-x: 50%;
          --glow-y: 35%;
          transform: perspective(1100px) rotateX(var(--rotate-x)) rotateY(var(--rotate-y));
          transform-style: preserve-3d;
          transition: transform 180ms ease-out, border-color 250ms ease, box-shadow 250ms ease;
          box-shadow:
            inset 0 1px 0 rgba(255,255,255,.12),
            0 32px 90px rgba(0,0,0,.48);
        }

        .login-card:hover {
          border-color: rgba(178,196,255,.26);
        }

        .login-card-glow {
          pointer-events: none;
          background: radial-gradient(
            circle at var(--glow-x) var(--glow-y),
            rgba(125,155,255,.26),
            transparent 34%
          );
          transition: background 80ms linear;
        }

        .login-field {
          box-shadow: inset 0 1px 0 rgba(255,255,255,.035);
        }

        @keyframes auroraOne {
          from { transform: translate3d(-3%, -2%, 0) scale(.95); }
          to { transform: translate3d(10%, 8%, 0) scale(1.08); }
        }

        @keyframes auroraTwo {
          from { transform: translate3d(6%, 2%, 0) scale(1); }
          to { transform: translate3d(-8%, -9%, 0) scale(1.08); }
        }

        @keyframes coreFloat {
          0%, 100% { transform: translate(-50%, -50%) translateY(0) scale(1); }
          50% { transform: translate(-50%, -50%) translateY(-12px) scale(1.05); }
        }

        @keyframes orbit {
          from { transform: translate(-50%, -50%) rotate(0deg); }
          to { transform: translate(-50%, -50%) rotate(360deg); }
        }

        @keyframes twinkle {
          0%, 100% { opacity: .16; transform: scale(.85); }
          50% { opacity: .75; transform: scale(1.25); }
        }

        .login-card-enter {
          animation: loginCardEnter 520ms cubic-bezier(.16,1,.3,1) both;
        }

        .login-stage {
          opacity: 0;
          animation: loginStageEnter 420ms cubic-bezier(.16,1,.3,1) both;
        }

        .login-stage-1 { animation-delay: 90ms; }
        .login-stage-2 { animation-delay: 150ms; }

        .login-success {
          animation: loginSuccessPulse 420ms cubic-bezier(.16,1,.3,1) both;
        }

        .login-check {
          animation: loginCheckIn 320ms cubic-bezier(.16,1,.3,1) both;
        }

        @keyframes loginCardEnter {
          from { opacity: 0; transform: perspective(1100px) translateY(10px) scale(.975); }
          to { opacity: 1; transform: perspective(1100px) translateY(0) scale(1); }
        }

        @keyframes loginStageEnter {
          from { opacity: 0; transform: translateY(7px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @keyframes loginSuccessPulse {
          0% { transform: scale(.985); }
          55% { transform: scale(1.015); }
          100% { transform: scale(1); }
        }

        @keyframes loginCheckIn {
          from { opacity: 0; transform: scale(.4) rotate(-18deg); }
          to { opacity: 1; transform: scale(1) rotate(0); }
        }

        @media (max-width: 640px) {
          .login-door-glow { width: 92vw !important; height: 68vh !important; }
          .login-door-frame { width: 78vw !important; height: 64vh !important; }
          .login-door-camera { animation-duration: 1.75s; }
          .login-orbit { width: 430px; height: 430px; }
          .login-orbit-two { width: 320px; height: 320px; }
          .login-core { width: 190px; height: 190px; }
          .login-card { transform: none !important; }
          .login-floating-block { opacity: .42; transform: scale(.76); }
        }

        @media (prefers-reduced-motion: reduce) {
          .login-aurora,
          .login-orbit,
          .login-core,
          .login-star,
          .login-floating-block {
            animation: none !important;
          }
          .login-card {
            transform: none !important;
            transition: none !important;
          }
          .login-door-intro {
            display: none !important;
          }
          .login-parallax-back,
          .login-parallax-mid,
          .login-parallax-front,
          .login-stage,
          .login-card-enter,
          .login-success,
          .login-check {
            animation: none !important;
            transform: none !important;
            translate: none !important;
            margin-left: 0 !important;
            margin-top: 0 !important;
          }
        }
      `}</style>
    </main>
  );
}
