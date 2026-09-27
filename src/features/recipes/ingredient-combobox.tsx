"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useController, type Control } from "react-hook-form";
import type { RecipeInput } from "./schema";
import { useI18n } from "@/lib/i18n/context";

type IngredientSuggestion = { id: string; name: string; recipeCount: number };

export function IngredientCombobox({
  control,
  index,
}: {
  control: Control<RecipeInput>;
  index: number;
}) {
  const { t } = useI18n();
  const listId = useId();
  const inputId = useId();
  const confirmed = useRef("");
  const name = useController({ control, name: `ingredients.${index}.name` });
  const ingredientId = useController({
    control,
    name: `ingredients.${index}.ingredientId`,
  });
  const createNew = useController({
    control,
    name: `ingredients.${index}.createNew`,
  });
  const [items, setItems] = useState<IngredientSuggestion[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [active, setActive] = useState(-1);
  const query = String(name.field.value ?? "");

  useEffect(() => {
    if (ingredientId.field.value && !confirmed.current)
      confirmed.current = query;
  }, [ingredientId.field.value, query]);

  useEffect(() => {
    const value = query.trim();
    if (value.length < 2 || confirmed.current === query) return;
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setIsLoading(true);
      try {
        const response = await fetch(
          `/api/ingredients?q=${encodeURIComponent(value)}`,
          {
            signal: controller.signal,
          },
        );
        if (!response.ok) throw new Error("Suggestions unavailable");
        const result = (await response.json()) as {
          items?: IngredientSuggestion[];
        };
        setItems(result.items ?? []);
        setActive(-1);
        setIsOpen(true);
      } catch (error) {
        if (!(error instanceof DOMException && error.name === "AbortError"))
          setIsOpen(false);
      } finally {
        if (!controller.signal.aborted) setIsLoading(false);
      }
    }, 180);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  const choose = (item: IngredientSuggestion) => {
    confirmed.current = item.name;
    name.field.onChange(item.name);
    ingredientId.field.onChange(item.id);
    createNew.field.onChange(false);
    setIsOpen(false);
  };
  const confirmNew = () => {
    confirmed.current = query;
    ingredientId.field.onChange(undefined);
    createNew.field.onChange(true);
    setIsOpen(false);
  };

  return (
    <div
      className="editor-field ingredient-combobox"
      onBlur={(event) => {
        const next = event.relatedTarget;
        if (!(next instanceof Node) || !event.currentTarget.contains(next))
          setIsOpen(false);
      }}
    >
      <label htmlFor={inputId}>{t("common.ingredients")}</label>
      <input
        {...name.field}
        id={inputId}
        value={query}
        maxLength={100}
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={isOpen}
        aria-controls={listId}
        aria-activedescendant={active >= 0 ? `${listId}-${active}` : undefined}
        aria-invalid={Boolean(name.fieldState.error)}
        onChange={(event) => {
          const value = event.target.value;
          confirmed.current = "";
          name.field.onChange(event);
          ingredientId.field.onChange(undefined);
          createNew.field.onChange(false);
          if (value.trim().length < 2) {
            setItems([]);
            setIsOpen(false);
            setIsLoading(false);
          }
        }}
        onFocus={() =>
          query.trim().length >= 2 &&
          confirmed.current !== query &&
          setIsOpen(true)
        }
        onKeyDown={(event) => {
          if (!isOpen) return;
          if (event.key === "ArrowDown" && items.length) {
            event.preventDefault();
            setActive((value) => (value + 1) % items.length);
          } else if (event.key === "ArrowUp" && items.length) {
            event.preventDefault();
            setActive((value) => (value <= 0 ? items.length - 1 : value - 1));
          } else if (event.key === "Enter" && active >= 0) {
            event.preventDefault();
            choose(items[active]);
          } else if (event.key === "Escape") setIsOpen(false);
        }}
      />
      {isOpen ? (
        <div className="ingredient-suggestions glass">
          {isLoading ? <p role="status">{t("search.finding")}</p> : null}
          {items.length ? (
            <ul id={listId} role="listbox" aria-label={t("common.ingredients")}>
              {items.map((item, itemIndex) => (
                <li role="presentation" key={item.id}>
                  <button
                    id={`${listId}-${itemIndex}`}
                    role="option"
                    aria-selected={active === itemIndex}
                    type="button"
                    onClick={() => choose(item)}
                    onMouseEnter={() => setActive(itemIndex)}
                  >
                    <strong>{item.name}</strong>
                    <small>
                      {t("editor.recipeUsage")} {item.recipeCount}
                    </small>
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
          {!isLoading ? (
            <button
              type="button"
              className="ingredient-create"
              onClick={confirmNew}
            >
              {t("editor.newIngredient").replace("{name}", query.trim())}
            </button>
          ) : null}
        </div>
      ) : null}
      {ingredientId.field.value ? (
        <small className="ingredient-confirmed">
          {t("editor.existingIngredient")}
        </small>
      ) : null}
      {createNew.field.value ? (
        <small className="ingredient-confirmed">
          {t("editor.ingredientWillBeAdded")}
        </small>
      ) : null}
      {name.fieldState.error ? (
        <small className="field-error">{t("editor.ingredientRequired")}</small>
      ) : null}
    </div>
  );
}
