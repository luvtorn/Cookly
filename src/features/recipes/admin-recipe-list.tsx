import Image from "next/image";
import Link from "next/link";
export function AdminRecipeList({
  recipes,
}: {
  recipes: {
    id: string;
    title: string;
    status: string;
    coverImageUrl: string;
    updatedAt: Date;
  }[];
}) {
  if (!recipes.length)
    return (
      <div className="admin-empty">
        <h3>A fresh page awaits</h3>
        <p>Create your first recipe and build the Cookly collection.</p>
      </div>
    );
  return (
    <ul className="admin-recipe-list">
      {recipes.map((recipe) => (
        <li key={recipe.id}>
          <Image src={recipe.coverImageUrl} alt="" width={88} height={64} />
          <div>
            <h3>
              <Link href={`/admin/recipes/${recipe.id}/edit`}>
                {recipe.title}
              </Link>
            </h3>
            <p>
              Cookly · Updated {recipe.updatedAt.toISOString().slice(0, 10)}
            </p>
          </div>
          <span
            className={`recipe-status status-${recipe.status.toLowerCase()}`}
          >
            {recipe.status.toLowerCase()}
          </span>
          <Link
            className="button-secondary"
            href={`/admin/recipes/${recipe.id}/edit`}
          >
            Edit <span className="sr-only">{recipe.title}</span>→
          </Link>
        </li>
      ))}
    </ul>
  );
}
