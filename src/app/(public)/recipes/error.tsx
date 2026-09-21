"use client";
export default function RecipeError({ reset }: { reset: () => void }) {
  return (
    <main id="main-content" className="home-container catalog-error glass">
      <h1>The recipe could not load</h1>
      <p>Please try again in a moment.</p>
      <button className="button-primary" onClick={reset}>
        Try again
      </button>
    </main>
  );
}
