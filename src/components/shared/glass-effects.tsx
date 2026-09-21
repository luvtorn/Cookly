"use client";

import { useEffect, useRef } from "react";
import { createLensMap } from "./lens-map";

const controls =
  ".category-card, .sign-in-button, .button-primary, .search-submit, .auth-tabs a, .auth-submit, .icon-button";
const surfaces = `${controls}, .site-header, .auth-modal`;
const svgNamespace = "http://www.w3.org/2000/svg";

/** Progressive enhancement only; the material and keyboard states work without JS. */
export function GlassEffects() {
  const definitions = useRef<SVGDefsElement>(null);
  useEffect(() => {
    const defs = definitions.current;
    if (!defs) return;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)");
    const fine = matchMedia("(hover: hover) and (pointer: fine)");
    // SVG backdrop displacement is visually verified in Chromium. Other engines
    // deliberately retain the CSS material, even if CSS.supports accepts url().
    const hasLens =
      /(?:Chrome|Chromium|Edg)\//.test(navigator.userAgent) &&
      !/OPR\//.test(navigator.userAgent) &&
      CSS.supports("backdrop-filter", 'url("#lens")');
    const filters = new Map<
      HTMLElement,
      { filter: SVGFilterElement; size: string }
    >();
    let nextId = 0;
    let pointerFrame = 0;
    let current: HTMLElement | null = null;
    let pressed: HTMLElement | null = null;
    let releaseTimer: ReturnType<typeof setTimeout> | undefined;

    const updateLens = (element: HTMLElement) => {
      const entry = filters.get(element);
      if (!entry || !element.isConnected) return;
      // Local layout dimensions avoid scaling the map during modal entrance.
      const width = element.clientWidth;
      const height = element.clientHeight;
      if (!width || !height) return;
      const radius =
        parseFloat(getComputedStyle(element).borderTopLeftRadius) || 0;
      const size = `${width}/${height}/${radius}`;
      if (entry.size === size) return;
      entry.size = size;
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext("2d");
      if (!context) return;
      context.putImageData(
        new ImageData(createLensMap(width, height, radius), width, height),
        0,
        0,
      );
      const map = document.createElementNS(svgNamespace, "feImage");
      map.setAttribute("href", canvas.toDataURL());
      map.setAttribute("width", String(width));
      map.setAttribute("height", String(height));
      map.setAttribute("result", "lens-map");
      const displacement = document.createElementNS(
        svgNamespace,
        "feDisplacementMap",
      );
      displacement.setAttribute("in", "SourceGraphic");
      displacement.setAttribute("in2", "lens-map");
      displacement.setAttribute(
        "scale",
        element.matches(".auth-modal") ? "18" : "14",
      );
      displacement.setAttribute("xChannelSelector", "R");
      displacement.setAttribute("yChannelSelector", "G");
      entry.filter.setAttribute("width", String(width));
      entry.filter.setAttribute("height", String(height));
      entry.filter.replaceChildren(map, displacement);
      element.style.setProperty("--liquid-lens", `url("#${entry.filter.id}")`);
      element.dataset.lens = "ready";
    };
    const resize = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.target instanceof HTMLElement) updateLens(entry.target);
      }
    });
    const attach = (element: HTMLElement) => {
      if (!hasLens || filters.has(element)) return;
      const filter = document.createElementNS(svgNamespace, "filter");
      filter.id = `cookly-lens-${++nextId}`;
      filter.setAttribute("filterUnits", "userSpaceOnUse");
      filter.setAttribute("color-interpolation-filters", "sRGB");
      filter.setAttribute("x", "0");
      filter.setAttribute("y", "0");
      defs.append(filter);
      filters.set(element, { filter, size: "" });
      resize.observe(element);
    };
    document.querySelectorAll<HTMLElement>(surfaces).forEach(attach);
    const mutation = new MutationObserver((records) => {
      for (const record of records) {
        for (const node of record.addedNodes) {
          if (!(node instanceof HTMLElement)) continue;
          if (node.matches(surfaces)) attach(node);
          node.querySelectorAll<HTMLElement>(surfaces).forEach(attach);
        }
      }
      for (const [element, entry] of filters) {
        if (element.isConnected) continue;
        resize.unobserve(element);
        entry.filter.remove();
        filters.delete(element);
      }
    });
    mutation.observe(document.body, { childList: true, subtree: true });

    const clear = () => {
      cancelAnimationFrame(pointerFrame);
      pointerFrame = 0;
      current = null;
    };
    const reset = () => {
      clear();
      document.querySelectorAll<HTMLElement>(controls).forEach((element) => {
        element.style.removeProperty("--glint-x");
        element.style.removeProperty("--glint-y");
      });
    };
    const move = (event: PointerEvent) => {
      if (reduced.matches || !fine.matches || event.pointerType === "touch")
        return;
      const target =
        event.target instanceof Element
          ? event.target.closest<HTMLElement>(controls)
          : null;
      if (!target || target.matches(':disabled, [aria-disabled="true"]')) {
        clear();
        return;
      }
      if (current !== target) clear();
      current = target;
      cancelAnimationFrame(pointerFrame);
      pointerFrame = requestAnimationFrame(() => {
        const rect = target.getBoundingClientRect();
        target.style.setProperty("--glint-x", `${event.clientX - rect.left}px`);
        target.style.setProperty("--glint-y", `${event.clientY - rect.top}px`);
        pointerFrame = 0;
      });
    };
    const releaseTouch = () => {
      clearTimeout(releaseTimer);
      if (pressed) delete pressed.dataset.glassPressed;
      pressed = null;
    };
    const pressTouch = (event: PointerEvent) => {
      if (event.pointerType !== "touch") return;
      releaseTouch();
      const target =
        event.target instanceof Element
          ? event.target.closest<HTMLElement>(controls)
          : null;
      if (!target || target.matches(':disabled, [aria-disabled="true"]'))
        return;
      pressed = target;
      target.dataset.glassPressed = "true";
    };
    const finishTouch = () => {
      if (pressed) releaseTimer = setTimeout(releaseTouch, 160);
    };
    document.addEventListener("pointermove", move, { passive: true });
    document.addEventListener("pointerdown", pressTouch, { passive: true });
    document.addEventListener("pointerup", finishTouch, { passive: true });
    document.addEventListener("pointercancel", releaseTouch, { passive: true });
    document.documentElement.addEventListener("pointerleave", clear);
    reduced.addEventListener("change", reset);
    fine.addEventListener("change", reset);
    return () => {
      reset();
      releaseTouch();
      resize.disconnect();
      mutation.disconnect();
      document.removeEventListener("pointermove", move);
      document.removeEventListener("pointerdown", pressTouch);
      document.removeEventListener("pointerup", finishTouch);
      document.removeEventListener("pointercancel", releaseTouch);
      document.documentElement.removeEventListener("pointerleave", clear);
      reduced.removeEventListener("change", reset);
      fine.removeEventListener("change", reset);
      for (const [element, entry] of filters) {
        element.style.removeProperty("--liquid-lens");
        delete element.dataset.lens;
        entry.filter.remove();
      }
    };
  }, []);

  return (
    <svg className="glass-definitions" aria-hidden="true" focusable="false">
      <defs ref={definitions} />
    </svg>
  );
}
