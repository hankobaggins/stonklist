"use client";
import { useEffect } from "react";

/** Fire-and-forget click counter for listing pages. */
export function ClickBeacon({ mint }: { mint: string }) {
  useEffect(() => {
    try {
      const key = `clicked:${mint}`;
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, "1");
    } catch {}
    navigator.sendBeacon?.(`/api/click/${mint}`);
  }, [mint]);
  return null;
}
