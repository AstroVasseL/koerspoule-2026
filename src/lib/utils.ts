import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Smooth scroll to an element by id with sticky-header offset.
 * Uses native scrollIntoView so it works on iOS Safari.
 */
export function smoothScrollTo(id: string, opts?: { block?: ScrollLogicalPosition }) {
  if (typeof window === "undefined") return;
  const el = document.getElementById(id);
  if (!el) return;
  // Defer to next frame so layout is settled (e.g. after route change)
  requestAnimationFrame(() => {
    el.scrollIntoView({ behavior: "smooth", block: opts?.block ?? "start" });
  });
}

/** Smooth scroll to top of the window. */
export function smoothScrollToTop() {
  if (typeof window === "undefined") return;
  requestAnimationFrame(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  });
}
