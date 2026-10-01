import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth/session";
import { getDb } from "@/lib/db/client";
import { ReviewForm } from "@/features/moderation/review-form";
import { verificationLabels } from "@/features/moderation/constants";

export const metadata = {
  title: "Private recipe review · Cookly Studio",
  robots: { index: false, follow: false },
};
export default async function AdminRecipe({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await requireAdmin(`/admin/recipes/${id}`);
  const recipe = await getDb().recipe.findUnique({
    where: { id },
    select: {
      id: true,
      title: true,
      description: true,
      coverImageUrl: true,
      coverImageIsAi: true,
      status: true,
      isHidden: true,
      isEditorial: true,
      verificationStatus: true,
      updatedAt: true,
      servings: true,
      prepMinutes: true,
      cookMinutes: true,
      difficulty: true,
      author: {
        select: { profile: { select: { displayName: true, username: true } } },
      },
      category: { select: { name: true } },
      cuisine: { select: { name: true } },
      tags: { select: { tag: { select: { name: true } } } },
      ingredients: {
        orderBy: { position: "asc" },
        select: {
          id: true,
          amount: true,
          unit: true,
          note: true,
          isOptional: true,
          ingredient: { select: { name: true } },
        },
      },
      steps: {
        orderBy: { position: "asc" },
        select: { id: true, instruction: true },
      },
    },
  });
  if (!recipe) notFound();
  const reason = recipe.isEditorial
    ? "Editorial verification is managed automatically by Studio."
    : recipe.status !== "PUBLISHED"
      ? "Only published recipes can be reviewed."
      : recipe.isHidden
        ? "Hidden recipes cannot change verification status."
        : null;
  return (
    <>
      <header className="admin-page-heading">
        <Link className="text-link" href="/admin/recipes">
          ← All recipes
        </Link>
        <p className="eyebrow">Private administrative preview</p>
        <h1>{recipe.title}</h1>
        <p>
          {recipe.isEditorial ? "Cookly editorial" : "Community"} ·{" "}
          {recipe.author.profile?.displayName ?? "Cookly member"} · @
          {recipe.author.profile?.username ?? "—"}
        </p>
        <p>
          {recipe.status} · {verificationLabels[recipe.verificationStatus]}
          {recipe.isHidden ? " · Hidden" : ""}
        </p>
      </header>
      <section className="admin-panel glass admin-recipe-preview">
        <Image
          src={recipe.coverImageUrl}
          alt={recipe.title}
          width={900}
          height={600}
        />
        {recipe.coverImageIsAi && <p>AI-generated illustration</p>}
        <h2>About this recipe</h2>
        <p>{recipe.description}</p>
        <p>
          {recipe.category.name} ·{" "}
          {recipe.cuisine?.name ?? "No cuisine specified"} · {recipe.difficulty}
        </p>
        <p>
          {recipe.servings} servings · Preparation {recipe.prepMinutes} min ·
          Cooking {recipe.cookMinutes} min · Total{" "}
          {recipe.prepMinutes + recipe.cookMinutes} min
        </p>
        <p>{recipe.tags.map(({ tag }) => tag.name).join(" · ")}</p>
        <div className="admin-recipe-details">
          <section>
            <h2>Ingredients</h2>
            <ul>
              {recipe.ingredients.map((item) => (
                <li key={item.id}>
                  {item.amount?.toString()} {item.unit} {item.ingredient.name}
                  {item.isOptional ? " (optional)" : ""}
                  {item.note ? ` — ${item.note}` : ""}
                </li>
              ))}
            </ul>
          </section>
          <section>
            <h2>Method</h2>
            <ol>
              {recipe.steps.map((step) => (
                <li key={step.id}>{step.instruction}</li>
              ))}
            </ol>
          </section>
        </div>
      </section>
      <section className="admin-panel glass">
        <h2>Verification</h2>
        <p>Changing verification never changes publication or visibility.</p>
        {reason ? (
          <p>{reason}</p>
        ) : (
          <ReviewForm
            key={recipe.updatedAt.toISOString()}
            recipeId={recipe.id}
            updatedAt={recipe.updatedAt.toISOString()}
            currentStatus={recipe.verificationStatus}
          />
        )}
        <Link className="text-link" href={`/admin/verification/${id}/history`}>
          Browse verification history →
        </Link>
      </section>
    </>
  );
}
