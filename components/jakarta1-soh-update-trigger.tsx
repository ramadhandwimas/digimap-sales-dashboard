"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { RefreshCw } from "lucide-react";

export default function Jakarta1SohUpdateTrigger() {
  const [mount, setMount] = useState<HTMLElement | null>(null);
  const [refreshButton, setRefreshButton] = useState<HTMLButtonElement | null>(null);
  const [updating, setUpdating] = useState(false);
  const [notice, setNotice] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    let cancelled = false;
    let timer = 0;

    const findTarget = () => {
      if (cancelled) return;
      const host = document.querySelector('[data-j1-soh-host="1"]') as HTMLElement | null;
      if (!host) {
        setMount(null);
        setRefreshButton(null);
        return;
      }

      const buttons = [...host.querySelectorAll("header button")] as HTMLButtonElement[];
      const refresh = buttons.find((button) => button.textContent?.trim().includes("Perbarui")) || null;
      if (!refresh || !refresh.parentElement) {
        setMount(null);
        setRefreshButton(null);
        return;
      }

      let slot = host.querySelector('[data-j1-soh-update-slot="1"]') as HTMLElement | null;
      if (!slot) {
        slot = document.createElement("span");
        slot.dataset.j1SohUpdateSlot = "1";
        slot.className = "contents";
        refresh.parentElement.insertBefore(slot, refresh);
      }

      setMount(slot);
      setRefreshButton(refresh);
    };

    timer = window.setInterval(findTarget, 300);
    findTarget();

    return () => {
      cancelled = true;
      if (timer) window.clearInterval(timer);
      document.querySelector('[data-j1-soh-update-slot="1"]')?.remove();
    };
  }, []);

  const updateSoh = async () => {
    if (updating) return;
    setUpdating(true);
    setNotice(null);

    try {
      const response = await fetch("/api/jakarta1-soh-update", {
        method: "POST",
        cache: "no-store",
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || payload?.success !== true) throw new Error("update-failed");

      refreshButton?.click();
      setNotice({ type: "success", text: "SOH berhasil diperbarui." });
    } catch {
      setNotice({ type: "error", text: "Update SOH gagal. Silakan coba kembali." });
    } finally {
      setUpdating(false);
      window.setTimeout(() => setNotice(null), 5000);
    }
  };

  if (!mount) return null;

  return createPortal(
    <>
      <button
        type="button"
        onClick={() => void updateSoh()}
        disabled={updating}
        className="flex items-center gap-2 rounded-xl bg-[#086aad] px-3 py-2 text-sm font-bold text-white shadow-sm disabled:cursor-not-allowed disabled:opacity-60"
      >
        <RefreshCw className={`size-4 ${updating ? "animate-spin" : ""}`} />
        {updating ? "Updating SOH..." : "Update SOH"}
      </button>
      {notice &&
        createPortal(
          <div
            className={`fixed right-4 top-20 z-[100] max-w-sm rounded-xl border px-4 py-3 text-sm font-bold shadow-lg ${
              notice.type === "success"
                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                : "border-rose-200 bg-rose-50 text-rose-700"
            }`}
          >
            {notice.text}
          </div>,
          document.body
        )}
    </>,
    mount
  );
}
