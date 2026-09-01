"use client";

import { useSyncExternalStore } from "react";

function greetingFor(hour: number) {
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

/** The greeting is fixed for the visit, so there is nothing to subscribe to. */
const subscribe = () => () => {};

const getSnapshot = () => greetingFor(new Date().getHours());

/**
 * Greets the visitor against *their* clock, which only the browser knows.
 * The server has no idea which of the three it will be, so it renders nothing
 * and the greeting fades in on hydration — the reserved line height keeps the
 * page from jumping when it resolves.
 */
export function Greeting({ className }: { className?: string }) {
  const greeting = useSyncExternalStore(subscribe, getSnapshot, () => null);

  return (
    <span className={`greeting-in ${className ?? ""}`} data-ready={greeting !== null}>
      {/* A zero-width space holds the line open before the hour is known. */}
      {greeting ?? "​"}
    </span>
  );
}
