"use client";

import { PropsWithChildren, useMemo } from "react";
import { useSyncExternalStore } from "react";

const subscribers = new Set<(count: number) => void>();
let activeCount = 0;
let lastActivity = Date.now();
const STALE_REQUEST_TIMEOUT_MS = 20_000;

const emit = () => {
  lastActivity = Date.now();
  for (const listener of subscribers) {
    listener(activeCount);
  }
};

const resetIfStuck = () => {
  if (activeCount === 0) return;
  const elapsed = Date.now() - lastActivity;
  if (elapsed > STALE_REQUEST_TIMEOUT_MS) {
    activeCount = 0;
    emit();
    console.warn(
      "⌛ Tempo de sincronização excedido. Reiniciando indicador de carregamento global.",
      { elapsed }
    );
  }
};

setInterval(resetIfStuck, STALE_REQUEST_TIMEOUT_MS);

export const trackRequestStart = () => {
  activeCount += 1;
  emit();
};

export const trackRequestEnd = () => {
  activeCount = Math.max(0, activeCount - 1);
  emit();
};

const subscribe = (listener: (count: number) => void) => {
  subscribers.add(listener);
  return () => subscribers.delete(listener);
};

const getSnapshot = () => activeCount;

export const useGlobalLoading = () => {
  const count = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  return useMemo(() => ({ isLoading: count > 0, activeCount: count }), [count]);
};

export function GlobalLoadingOverlay({ children }: PropsWithChildren) {
  return <>{children}</>;
}
