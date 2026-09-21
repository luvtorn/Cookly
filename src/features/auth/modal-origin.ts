"use client";

// Transient navigation context only: never persist form values or credentials.
let origin:
  | { url: string; left: number; top: number; trigger: HTMLElement | null }
  | undefined;
export function rememberModalOrigin(url: string, trigger: HTMLElement) {
  origin = { url, left: window.scrollX, top: window.scrollY, trigger };
}
export function getModalOrigin(url: string) {
  return origin?.url === url ? origin : undefined;
}
