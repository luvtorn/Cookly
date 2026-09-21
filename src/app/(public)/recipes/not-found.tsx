import Link from "next/link";
export default function RecipeNotFound() {
  return (
    <main id="main-content" className="status-shell glass">
      <p className="eyebrow">404 · Off the menu</p>
      <h1>This recipe isn’t on the menu.</h1>
      <p>It may be unpublished or no longer available.</p>
      <Link href="/#recipes" className="button-primary">
        Explore recipes →
      </Link>
    </main>
  );
}
