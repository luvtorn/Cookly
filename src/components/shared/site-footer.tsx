import { Heart } from "lucide-react";
import { getI18n } from "@/lib/i18n/server";

export async function SiteFooter() {
  const { locale } = await getI18n();
  const text = {
    en: [
      "Better meals. A brighter you.",
      "Cookly is taking shape · More coming soon",
    ],
    ru: [
      "Вкуснее блюда. Ярче каждый день.",
      "Cookly развивается · Скоро будет больше",
    ],
    pl: [
      "Lepsze posiłki. Jaśniejszy dzień.",
      "Cookly nabiera kształtu · Więcej już wkrótce",
    ],
  }[locale];
  return (
    <footer className="site-footer">
      <span>{text[0]}</span>
      <Heart size={13} aria-hidden="true" />
      <span>Cookly</span>
      <span className="demo-label">{text[1]}</span>
    </footer>
  );
}
