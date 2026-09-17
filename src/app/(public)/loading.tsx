export default function Loading() {
  return (
    <main
      id="main-content"
      className="home-container loading-shell"
      aria-busy="true"
      aria-label="Loading recipes"
    >
      <p role="status" className="sr-only">
        Preparing some cooking inspiration…
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
