"use client";
import { useState } from "react";

export function CopyButton({ text, label = "copy" }: { text: string; label?: string }) {
  const [ok, setOk] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setOk(true);
          setTimeout(() => setOk(false), 1500);
        } catch {}
      }}
      className="pill h-7 px-3 text-[11.5px] shrink-0"
      data-active={ok}
    >
      {ok ? "copied" : label}
    </button>
  );
}
