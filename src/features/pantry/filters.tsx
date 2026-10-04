import Link from "next/link";
import { GlassSelect } from "@/components/shared/glass-select";
import { getI18n } from "@/lib/i18n/server";
import { localizePath } from "@/lib/i18n/config";
import { pantryUrl, type PantryQuery } from "./schema";

export async function PantryFilters({
  query,
  cuisines,
}: {
  query: PantryQuery;
  cuisines: { slug: string; name: string }[];
}) {
  const { locale, t } = await getI18n();
  return (
    <form
      className="pantry-filters glass"
      key={pantryUrl(query)}
      action={localizePath(locale, "/pantry")}
    >
      <div className="pantry-filter-grid">
        <label>
          {t("catalog.maxTime")}
          <input
            name="maxTime"
            type="number"
            min={1}
            max={1440}
            defaultValue={query.maxTime}
            placeholder={t("catalog.anyTime")}
          />
        </label>
        <div className="glass-select-field">
          <span>{t("catalog.difficulty")}</span>
          <GlassSelect
            name="difficulty"
            ariaLabel={t("catalog.difficulty")}
            defaultValue={query.difficulty ?? ""}
            options={[
              { value: "", label: t("catalog.anyDifficulty") },
              { value: "EASY", label: t("difficulty.easy") },
              { value: "MEDIUM", label: t("difficulty.medium") },
              { value: "HARD", label: t("difficulty.hard") },
            ]}
          />
        </div>
        <div className="glass-select-field">
          <span>{t("catalog.cuisine")}</span>
          <GlassSelect
            name="cuisine"
            ariaLabel={t("catalog.cuisine")}
            defaultValue={query.cuisine ?? ""}
            options={[
              { value: "", label: t("catalog.allCuisines") },
              ...cuisines.map((c) => ({ value: c.slug, label: c.name })),
            ]}
          />
        </div>
        <div className="glass-select-field">
          <span>{t("pantryLive.maxMissing")}</span>
          <GlassSelect
            name="maxMissing"
            ariaLabel={t("pantryLive.maxMissing")}
            defaultValue={query.maxMissing}
            options={[
              ...["0", "1", "2", "3"].map((value) => ({ value, label: value })),
              { value: "any", label: t("pantryLive.any") },
            ]}
          />
        </div>
      </div>
      <div className="pantry-filter-actions">
        <button className="button-primary">{t("pantryLive.find")}</button>
        <Link
          className="button-secondary"
          href={localizePath(locale, "/pantry")}
        >
          {t("catalog.clearFilters")}
        </Link>
      </div>
    </form>
  );
}
