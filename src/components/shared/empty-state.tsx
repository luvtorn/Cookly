import Link from "next/link";
import { SearchX } from "lucide-react";

export function EmptyState({ isFiltered = false }: { isFiltered?: boolean }) {
  return (
    <div className="empty-state glass">
      <SearchX size={30} aria-hidden="true" />
      <h3>No recipes on the table yet</h3>
      <p>
        The community catalog is not connected yet. Recipes will appear here
        when discovery is ready.
      </p>
      {isFiltered ? (
        <Link className="text-link" href="/#recipes">
          Clear filters <span aria-hidden="true">→</span>
        </Link>
      ) : null}
    </div>
  );
}
