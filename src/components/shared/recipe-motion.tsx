"use client";

import { animate, inView } from "framer-motion";
import { useEffect } from "react";

/** Progressive enhancement: server-rendered content is always visible. */
export function RecipeMotion() {
  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (reduced.matches) return;
    const running = new Set<ReturnType<typeof animate>>();
    const stop = inView(
      ".recipe-detail [data-recipe-reveal]",
      (element) => {
        if (reduced.matches || !(element instanceof HTMLElement)) return;
        const animation = animate(
          element,
          {
            opacity: [0.65, 1],
            transform: ["translateY(8px)", "translateY(0px)"],
          },
          {
            duration: 0.32,
            ease: [0.2, 0.65, 0.3, 1],
            onComplete: () => {
              element.style.removeProperty("opacity");
              element.style.removeProperty("transform");
              running.delete(animation);
            },
          },
        );
        running.add(animation);
        // Returning no leave callback makes this a one-shot observation.
      },
      { amount: "some" },
    );
    function finish() {
      for (const animation of running) animation.complete();
      running.clear();
    }
    reduced.addEventListener("change", finish);
    return () => {
      stop();
      finish();
      reduced.removeEventListener("change", finish);
    };
  }, []);
  return null;
}
