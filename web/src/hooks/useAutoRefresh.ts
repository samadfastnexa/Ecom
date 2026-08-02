"use client";

import { useEffect, useRef } from "react";

/**
 * Calls `callback` on an interval while the tab is visible, plus once
 * immediately whenever the tab becomes visible again.
 *
 * Polling stops entirely in background tabs, so a dashboard left open
 * overnight doesn't keep hitting the API.
 */
export function useAutoRefresh(callback: () => void, intervalMs = 30_000) {
  const saved = useRef(callback);

  useEffect(() => {
    saved.current = callback;
  }, [callback]);

  useEffect(() => {
    if (intervalMs <= 0) return;

    let timer: ReturnType<typeof setInterval> | undefined;

    const stop = () => {
      if (timer) {
        clearInterval(timer);
        timer = undefined;
      }
    };

    const start = () => {
      stop();
      timer = setInterval(() => saved.current(), intervalMs);
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        saved.current(); // catch up on whatever changed while hidden
        start();
      } else {
        stop();
      }
    };

    if (document.visibilityState === "visible") start();
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      stop();
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [intervalMs]);
}
