"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useId, useState } from "react";
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
      setIsLoading(true);
      try {
        const response = await fetch(
          `/api/search/recipes?q=${encodeURIComponent(value)}`,
          {
            signal: controller.signal,
          },
        );
        if (!response.ok) throw new Error("Search unavailable");
        const result = (await response.json()) as { items?: Suggestion[] };
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

  return (
    <div
      className="recipe-search-assist"
      onBlur={(event) => {
        const next = event.relatedTarget;
        if (!(next instanceof Node) || !event.currentTarget.contains(next))
          setIsOpen(false);
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
        aria-activedescendant={active >= 0 ? `${listId}-${active}` : undefined}
        onChange={(event) => {
          const value = event.target.value;
          setQuery(value);
          if (value.trim().length < 2) {
            setItems([]);
            setIsOpen(false);
            setIsLoading(false);
          }
        }}
        onFocus={() => {
          setIsInteractive(true);
          if (query.trim().length >= 2 && items.length) setIsOpen(true);
        }}
        onKeyDown={(event) => {
          if (!isOpen || !items.length) return;
          if (event.key === "ArrowDown") {
            event.preventDefault();
            setActive((value) => (value + 1) % items.length);
          } else if (event.key === "ArrowUp") {
            event.preventDefault();
            setActive((value) => (value <= 0 ? items.length - 1 : value - 1));
          } else if (event.key === "Escape") {
            setIsOpen(false);
          } else if (event.key === "Enter" && active >= 0) {
            event.preventDefault();
            document.getElementById(`${listId}-${active}`)?.click();
          }
        }}
      />
      {isOpen ? (
        <div className="recipe-search-popover glass">
          {isLoading ? <p role="status">{t("search.finding")}</p> : null}
          {!isLoading && items.length === 0 ? <p>{t("search.empty")}</p> : null}
          {items.length ? (
            <ul id={listId} role="listbox" aria-label={t("search.suggestions")}>
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
      ) : null}
    </div>
  );
}
