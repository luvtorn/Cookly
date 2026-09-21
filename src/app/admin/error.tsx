"use client";
export default function AdminError({ reset }: { reset: () => void }) {
  return (
    <section className="admin-panel glass" role="alert">
      <h2>The studio could not load</h2>
      <p>Please try again in a moment.</p>
      <button className="button-primary" onClick={reset}>
        Try again
      </button>
    </section>
  );
}
