"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

/** Har sahifa ko'rinishida /api/track ga bir marta "ping" yuboradi */
export default function VisitTracker() {
  const pathname = usePathname();
  const last = useRef<string | null>(null);

  useEffect(() => {
    if (last.current === pathname) return; // bir path uchun bir marta
    last.current = pathname;
    fetch("/api/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path: pathname, kind: "view" }),
      keepalive: true
    }).catch(() => {});
  }, [pathname]);

  return null;
}
