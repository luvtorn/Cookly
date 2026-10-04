"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { IngredientPicker } from "@/components/shared/ingredient-picker";
import { useI18n } from "@/lib/i18n/context";
import {
  addPantryIngredient,
  removePantryIngredient,
  clearPantry,
} from "./actions";
import {
  pantryUrl,
  type PantryIngredient,
  type PantryQuery,
  type PantryResult,
} from "./schema";

export function PantryIngredientList({
  items,
  query,
}: {
  items: PantryIngredient[];
  query: PantryQuery;
}) {
  const { t, href } = useI18n();
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState("");
  const [failed, setFailed] = useState(false);
  function update(action: () => Promise<PantryResult>) {
    setMessage("");
    setFailed(false);
    startTransition(async () => {
      try {
        const result = await action();
        if (!result.success) {
          setFailed(true);
          setMessage(t(`pantryLive.error.${result.code}`));
          return;
        }
        setSearch("");
        setMessage(t("pantryLive.saved"));
        router.replace(href(pantryUrl({ ...query, page: 1 })), {
          scroll: false,
        });
        router.refresh();
      } catch {
        setFailed(true);
        setMessage(t("pantryLive.error.FAILED"));
      }
    });
  }
  return (
    <section
      className="pantry-manager glass"
      aria-labelledby="pantry-products"
      aria-busy={pending}
    >
      <div className="pantry-manager-heading">
        <h2 id="pantry-products">{t("pantryLive.products")}</h2>
        <span>
          {t("pantryLive.count").replace("{count}", String(items.length))}
        </span>
      </div>
      <p id="pantry-hint">{t("pantryLive.hint")}</p>
      <IngredientPicker
        value={search}
        onChange={setSearch}
        disabled={pending}
        onSelect={(item) =>
          update(() => addPantryIngredient({ ingredientId: item.id }))
        }
      />
      <ul className="pantry-chips" aria-label={t("pantryLive.products")}>
        {items.map((item) => (
          <li key={item.id}>
            <span>{item.name}</span>
            <button
              type="button"
              disabled={pending}
              aria-label={t("pantryLive.remove").replace("{name}", item.name)}
              onClick={() =>
                update(() => removePantryIngredient({ ingredientId: item.id }))
              }
            >
              <X size={16} aria-hidden="true" />
            </button>
          </li>
        ))}
      </ul>
      {items.length ? (
        <button
          className="button-secondary"
          type="button"
          disabled={pending}
          onClick={() => {
            if (window.confirm(t("pantryLive.confirm"))) update(clearPantry);
          }}
        >
          {t("pantryLive.clear")}
        </button>
      ) : (
        <p>{t("pantryLive.empty")}</p>
      )}
      <p className="pantry-save-status" role={failed ? "alert" : "status"}>
        {pending ? t("pantryLive.saving") : message}
      </p>
    </section>
  );
}
