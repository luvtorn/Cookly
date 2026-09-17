import Link from "next/link";
import {
  ArrowRight,
  CakeSlice,
  Clock3,
  Earth,
  Leaf,
  Salad,
  Soup,
} from "lucide-react";

const categories = [
  { id: "quick", label: "Quick & Easy", icon: Clock3, tone: "green" },
  { id: "fresh", label: "Fresh & Green", icon: Salad, tone: "lime" },
  { id: "comfort", label: "Comfort Food", icon: Soup, tone: "coral" },
  { id: "vegetarian", label: "Vegetarian", icon: Leaf, tone: "green" },
  { id: "desserts", label: "Desserts", icon: CakeSlice, tone: "coral" },
  { id: "global", label: "Global Flavors", icon: Earth, tone: "blue" },
] as const;

export function CategorySection({
  activeCategory,
}: {
  activeCategory?: string;
}) {
  return (
    <section
      className="category-section glass"
      id="categories"
      aria-labelledby="categories-title"
    >
      <div className="section-heading">
        <div>
          <h2 id="categories-title">Explore by category</h2>
          <p>Find your next favorite dish</p>
        </div>
        <Link href="/#recipes" className="text-link">
          View all <ArrowRight size={16} aria-hidden="true" />
        </Link>
      </div>
      <div className="category-grid">
        {categories.map(({ id, label, icon: Icon, tone }) => (
          <Link
            key={id}
            href={`/?category=${id}#recipes`}
            className="category-card glass"
            data-tone={tone}
            aria-current={activeCategory === id ? "true" : undefined}
          >
            <span className="category-icon">
              <Icon size={26} strokeWidth={1.6} aria-hidden="true" />
            </span>
            <span>{label}</span>
            <ArrowRight size={15} aria-hidden="true" />
          </Link>
        ))}
      </div>
    </section>
  );
}
