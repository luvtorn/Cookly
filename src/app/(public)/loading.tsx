import { getI18n } from "@/lib/i18n/server";

export default async function Loading() {
  const { t } = await getI18n();
  return (
    <main
      id="main-content"
      className="home-container loading-shell"
      aria-busy="true"
      aria-label={t("error.loading")}
    >
      <p role="status" className="sr-only">
        {t("error.loading")}…
      </p>
      <div className="skeleton skeleton-hero" />
      <div className="recipe-grid">
        {["first", "second", "third", "fourth"].map((id) => (
          <div key={id} className="skeleton skeleton-card" />
        ))}
      </div>
      <div className="skeleton skeleton-section" />
    </main>
  );
}
