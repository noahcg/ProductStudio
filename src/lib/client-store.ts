"use client";

import { useSyncExternalStore } from "react";

const noopSubscribe = () => () => {};
const localStorageEvent = "product-studio-local-storage";

export function useMounted() {
  return useSyncExternalStore(noopSubscribe, () => true, () => false);
}

export function setLocalStorageValue(key: string, value: string) {
  window.localStorage.setItem(key, value);
  window.dispatchEvent(new CustomEvent(localStorageEvent, { detail: { key } }));
}

export function useLocalStorageValue(key: string, fallback = "") {
  return useSyncExternalStore(
    (onStoreChange) => {
      const onStorage = (event: StorageEvent) => {
        if (!event.key || event.key === key) onStoreChange();
      };
      const onLocalStorage = (event: Event) => {
        const detail = (event as CustomEvent<{ key?: string }>).detail;
        if (!detail?.key || detail.key === key) onStoreChange();
      };

      window.addEventListener("storage", onStorage);
      window.addEventListener(localStorageEvent, onLocalStorage);

      return () => {
        window.removeEventListener("storage", onStorage);
        window.removeEventListener(localStorageEvent, onLocalStorage);
      };
    },
    () => {
      try {
        return window.localStorage.getItem(key) ?? fallback;
      } catch {
        return fallback;
      }
    },
    () => fallback
  );
}
