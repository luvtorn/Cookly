import Link from "next/link";
import { SearchX } from "lucide-react";

export function EmptyState() {
  return (
    <div className="empty-state glass">
      <SearchX size={30} aria-hidden="true" />
      <h3>No recipes on the table yet</h3>
      <p>
        Try “pasta” or “salmon”, or explore all five sample recipes.
        <br />
        The full community catalog is still cooking.
      </p>
      <Link className="text-link" href="/#recipes">
        Clear filters <span aria-hidden="true">→</span>
      </Link>
    </div>
  );
}
