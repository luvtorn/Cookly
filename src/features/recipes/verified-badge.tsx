import { BadgeCheck } from "lucide-react";
import { getI18n } from "@/lib/i18n/server";

export async function VerifiedBadge() {
  const { t } = await getI18n();
  return (
    <span
      className="verified-badge"
      title="Editorially reviewed by Cookly. Not professional certification or a claim that the dish was cooked."
    >
      <BadgeCheck size={18} aria-hidden="true" />
      {t("recipe.cooklyVerified")}
    </span>
  );
}

export async function VerifiedIcon() {
  const { t } = await getI18n();
  return (
    <span
      className="verified-icon"
      title="Cookly verified: editorial review, not professional certification."
      aria-label={t("recipe.cooklyVerified")}
      tabIndex={0}
    >
      <BadgeCheck size={19} aria-hidden="true" />
    </span>
  );
}
