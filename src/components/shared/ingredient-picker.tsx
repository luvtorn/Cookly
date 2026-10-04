"use client";
import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { z } from "zod";
import { useI18n } from "@/lib/i18n/context";

const suggestionsSchema = z.object({
  items: z.array(
    z.object({ id: z.string(), name: z.string(), recipeCount: z.number() }),
  ),
});
export type IngredientSuggestion = z.infer<
  typeof suggestionsSchema
>["items"][number];
export function IngredientPicker({
  value,
  onChange,
  onSelect,
  confirmed = false,
  onCreate,
  disabled = false,
  invalid = false,
  onBlur,
  name,
}: {
  value: string;
  onChange: (value: string) => void;
  onSelect: (item: IngredientSuggestion) => void;
  confirmed?: boolean;
  onCreate?: () => void;
  disabled?: boolean;
  invalid?: boolean;
  onBlur?: () => void;
  name?: string;
}) {
  const { t } = useI18n();
  const id = useId();
  const list = useRef<HTMLUListElement>(null);
  const popup = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [result, setResult] = useState<{
    query: string;
    items: IngredientSuggestion[];
    failed: boolean;
  } | null>(null);
  const query = value.trim();
  const current = result?.query === query ? result : null;
  const loading = query.length >= 2 && !current && !confirmed;
  const items = current?.items ?? [];
  useLayoutEffect(() => {
    if (!open || disabled) return;
    const position = () => {
      if (!popup.current || !input.current) return;
      const rect = input.current.getBoundingClientRect();
      const viewport = window.visualViewport;
      const top = (viewport?.offsetTop ?? 0) + 8;
      let bottom =
        (viewport?.offsetTop ?? 0) +
        (viewport?.height ?? window.innerHeight) -
        8;
      const nav = document.querySelector(
        ".mobile-bottom-navigation:not(.mobile-bottom-navigation--hidden)",
      );
      if (nav?.getClientRects().length)
        bottom = Math.min(bottom, nav.getBoundingClientRect().top - 12);
      const anchorTop = Math.min(rect.top - 6, bottom);
      const above = Math.max(0, anchorTop - top);
      const below = Math.max(0, bottom - rect.bottom - 6);
      const upward = below < 260 && above > below;
      popup.current.dataset.side = upward ? "top" : "bottom";
      const root = input.current.parentElement?.getBoundingClientRect();
      if (root) {
        popup.current.style.top = upward
          ? "auto"
          : `${rect.bottom - root.top + 6}px`;
        popup.current.style.bottom = upward
          ? `${root.bottom - anchorTop}px`
          : "auto";
      }
      popup.current.style.maxHeight = `${Math.min(320, upward ? above : below)}px`;
    };
    position();
    window.addEventListener("resize", position);
    window.addEventListener("scroll", position, {
      capture: true,
      passive: true,
    });
    window.visualViewport?.addEventListener("resize", position);
    return () => {
      window.removeEventListener("resize", position);
      window.removeEventListener("scroll", position, true);
      window.visualViewport?.removeEventListener("resize", position);
    };
  }, [open, disabled]);
  useEffect(() => {
    if (query.length < 2 || confirmed || disabled) return;
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      try {
        const response = await fetch(
          `/api/ingredients?q=${encodeURIComponent(query)}`,
          { signal: controller.signal, cache: "no-store" },
        );
        if (!response.ok) throw new Error("Unavailable");
        const data = suggestionsSchema.parse(await response.json());
        if (!controller.signal.aborted)
          setResult({ query, items: data.items, failed: false });
      } catch {
        if (!controller.signal.aborted)
          setResult({ query, items: [], failed: true });
      }
    }, 180);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [query, confirmed, disabled]);
  useEffect(() => {
    const option =
      list.current?.querySelectorAll<HTMLElement>('[role="option"]')[active];
    const panel = popup.current;
    if (option && panel) {
      const row = option.getBoundingClientRect();
      const box = panel.getBoundingClientRect();
      if (row.bottom > box.bottom) panel.scrollTop += row.bottom - box.bottom;
      else if (row.top < box.top) panel.scrollTop -= box.top - row.top;
    }
  }, [active]);
  function choose(item: IngredientSuggestion) {
    setOpen(false);
    setActive(-1);
    onSelect(item);
  }
  return (
    <div
      className="editor-field ingredient-combobox"
      onBlur={(event) => {
        onBlur?.();
        if (
          !(event.relatedTarget instanceof Node) ||
          !event.currentTarget.contains(event.relatedTarget)
        )
          setOpen(false);
      }}
    >
      <label htmlFor={id}>{t("common.ingredients")}</label>
      <input
        ref={input}
        id={id}
        name={name}
        value={value}
        maxLength={100}
        disabled={disabled}
        autoComplete="off"
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={open && !disabled}
        aria-controls={`${id}-list`}
        aria-activedescendant={
          open && active >= 0 && items[active] ? `${id}-${active}` : undefined
        }
        aria-invalid={invalid}
        onChange={(event) => {
          onChange(event.target.value);
          setActive(-1);
          setOpen(event.target.value.trim().length >= 2);
        }}
        onFocus={() => {
          if (query.length >= 2 && !confirmed) setOpen(true);
        }}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            setOpen(false);
            setActive(-1);
            return;
          }
          if (!open) return;
          if (event.key === "ArrowDown" && items.length) {
            event.preventDefault();
            setActive((v) => (v + 1) % items.length);
          }
          if (event.key === "ArrowUp" && items.length) {
            event.preventDefault();
            setActive((v) => (v <= 0 ? items.length - 1 : v - 1));
          }
          if (event.key === "Enter") {
            event.preventDefault();
            if (active >= 0 && items[active]) choose(items[active]);
          }
        }}
      />
      {open && !disabled ? (
        <div ref={popup} className="ingredient-suggestions glass">
          {loading ? <p role="status">{t("search.finding")}</p> : null}
          {current?.failed ? (
            <p role="alert">{t("pantryLive.suggestionsError")}</p>
          ) : null}
          <ul
            id={`${id}-list`}
            ref={list}
            role="listbox"
            aria-label={t("common.ingredients")}
          >
            {items.map((item, index) => (
              <li role="presentation" key={item.id}>
                <button
                  type="button"
                  role="option"
                  id={`${id}-${index}`}
                  aria-selected={active === index}
                  onMouseEnter={() => setActive(index)}
                  onClick={() => choose(item)}
                >
                  <strong>{item.name}</strong>
                  <small>
                    {t("editor.recipeUsage")} {item.recipeCount}
                  </small>
                </button>
              </li>
            ))}
          </ul>
          {!loading && !current?.failed && !items.length && !onCreate ? (
            <p role="status">{t("pantryLive.notFound")}</p>
          ) : null}
          {!loading && onCreate ? (
            <button
              type="button"
              className="ingredient-create"
              onClick={() => {
                setOpen(false);
                onCreate();
              }}
            >
              {t("editor.newIngredient").replace("{name}", query)}
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
