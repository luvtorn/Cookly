"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { useI18n } from "@/lib/i18n/context";

type Suggestion = {
  slug: string;
  title: string;
  image: string;
  minutes: number;
};

export function RecipeSearchField({
  id,
  label,
  hideLabel = false,
  defaultValue = "",
  placeholder,
}: {
  id: string;
  label?: string;
  hideLabel?: boolean;
  defaultValue?: string;
  placeholder?: string;
}) {
  const listId = useId();
  const root = useRef<HTMLDivElement>(null);
  const popover = useRef<HTMLDivElement>(null);
  const scrollArea = useRef<HTMLDivElement>(null);
  const dismissed = useRef(false);
  const [query, setQuery] = useState(defaultValue);
  const [items, setItems] = useState<Suggestion[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [active, setActive] = useState(-1);
  const [isInteractive, setIsInteractive] = useState(false);
  const { t, href } = useI18n();
  const visibleLabel = label ?? t("search.label");
  const visiblePlaceholder = placeholder ?? t("search.placeholder");

  useEffect(() => {
    if (!isInteractive) return;
    const value = query.trim();
    if (value.length < 2) return;
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      if (dismissed.current) return;
      setIsLoading(true);
      setIsOpen(true);
      try {
        const response = await fetch(
          `/api/search/recipes?q=${encodeURIComponent(value)}`,
          {
            signal: controller.signal,
          },
        );
        if (!response.ok) throw new Error("Search unavailable");
        const result = (await response.json()) as { items?: Suggestion[] };
        if (controller.signal.aborted || dismissed.current) return;
        setItems(result.items ?? []);
        setActive(-1);
        setIsOpen(true);
      } catch (error) {
        if (!(error instanceof DOMException && error.name === "AbortError")) {
          setItems([]);
          setIsOpen(false);
        }
      } finally {
        if (!controller.signal.aborted) setIsLoading(false);
      }
    }, 180);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [isInteractive, query]);

  useLayoutEffect(() => {
    if (!isOpen) return;
    function position() {
      const anchor = root.current?.getBoundingClientRect();
      const panel = popover.current;
      if (!anchor || !panel) return;
      const viewport = window.visualViewport;
      let top = (viewport?.offsetTop ?? 0) + 8;
      const header = document
        .querySelector(".site-header")
        ?.getBoundingClientRect();
      if (header && header.bottom > top && header.bottom < anchor.top) {
        top = header.bottom + 8;
      }
      let bottom =
        (viewport?.offsetTop ?? 0) + (viewport?.height ?? innerHeight) - 8;
      const navigation = document.querySelector(
        ".mobile-bottom-navigation:not(.mobile-bottom-navigation--hidden)",
      );
      if (navigation && navigation.getClientRects().length) {
        bottom = Math.min(bottom, navigation.getBoundingClientRect().top - 12);
      }
      const below = Math.max(0, bottom - anchor.bottom - 8);
      const above = Math.max(0, anchor.top - top - 8);
      const opensUp =
        below < Math.min(220, scrollArea.current?.scrollHeight ?? 220) &&
        above > below;
      panel.dataset.side = opensUp ? "top" : "bottom";
      panel.style.setProperty(
        "--search-available-height",
        `${Math.max(0, Math.min(360, opensUp ? above : below) - 2)}px`,
      );
    }
    position();
    window.addEventListener("resize", position);
    window.addEventListener("scroll", position, {
      capture: true,
      passive: true,
    });
    window.visualViewport?.addEventListener("resize", position);
    window.visualViewport?.addEventListener("scroll", position);
    return () => {
      window.removeEventListener("resize", position);
      window.removeEventListener("scroll", position, true);
      window.visualViewport?.removeEventListener("resize", position);
      window.visualViewport?.removeEventListener("scroll", position);
    };
  }, [isOpen, isLoading, items.length]);

  useEffect(() => {
    if (active < 0 || !isOpen) return;
    const option = document.getElementById(`${listId}-${active}`);
    const area = scrollArea.current;
    if (!option || !area) return;
    const bounds = area.getBoundingClientRect();
    const item = option.getBoundingClientRect();
    if (item.top < bounds.top) area.scrollTop += item.top - bounds.top;
    else if (item.bottom > bounds.bottom)
      area.scrollTop += item.bottom - bounds.bottom;
  }, [active, isOpen, listId]);

  return (
    <div
      ref={root}
      className="recipe-search-assist"
      onBlur={(event) => {
        const next = event.relatedTarget;
        if (!(next instanceof Node) || !event.currentTarget.contains(next)) {
          dismissed.current = true;
          setIsOpen(false);
        }
      }}
    >
      <label htmlFor={id} className={hideLabel ? "sr-only" : undefined}>
        {visibleLabel}
      </label>
      <input
        id={id}
        type="search"
        name="q"
        maxLength={100}
        value={query}
        placeholder={visiblePlaceholder}
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={isOpen}
        aria-controls={listId}
        aria-activedescendant={
          isOpen && active >= 0 ? `${listId}-${active}` : undefined
        }
        onChange={(event) => {
          const value = event.target.value;
          dismissed.current = false;
          setActive(-1);
          setItems([]);
          setQuery(value);
          if (value.trim().length < 2) {
            setItems([]);
            setIsOpen(false);
            setIsLoading(false);
          }
        }}
        onFocus={() => {
          dismissed.current = false;
          setIsInteractive(true);
          if (query.trim().length >= 2 && items.length) setIsOpen(true);
        }}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            dismissed.current = true;
            setIsOpen(false);
            setActive(-1);
            return;
          }
          if (!isOpen || !items.length) return;
          if (event.key === "ArrowDown") {
            event.preventDefault();
            setActive((value) => (value + 1) % items.length);
          } else if (event.key === "ArrowUp") {
            event.preventDefault();
            setActive((value) => (value <= 0 ? items.length - 1 : value - 1));
          } else if (event.key === "Enter" && active >= 0) {
            event.preventDefault();
            document.getElementById(`${listId}-${active}`)?.click();
          }
        }}
      />
      {isOpen ? (
        <div ref={popover} className="recipe-search-popover glass">
          <div ref={scrollArea} className="recipe-search-scroll">
            {isLoading ? <p role="status">{t("search.finding")}</p> : null}
            {!isLoading && items.length === 0 ? (
              <p>{t("search.empty")}</p>
            ) : null}
            {items.length ? (
              <ul
                id={listId}
                role="listbox"
                aria-label={t("search.suggestions")}
              >
                {items.map((item, index) => (
                  <li role="presentation" key={item.slug}>
                    <Link
                      id={`${listId}-${index}`}
                      role="option"
                      aria-selected={index === active}
                      href={href(`/recipes/${item.slug}`)}
                      onMouseEnter={() => setActive(index)}
                    >
                      <Image
                        src={item.image}
                        alt=""
                        width={56}
                        height={56}
                        sizes="56px"
                      />
                      <span>
                        <strong>{item.title}</strong>
                        <small>
                          {item.minutes} {t("common.minutes")}
                        </small>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
