import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getPublicRecipe } from "@/features/recipes/repository";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const recipe = await getPublicRecipe((await params).slug);
  return recipe
    ? { title: recipe.title, description: recipe.description }
    : { title: "Recipe not found" };
}
export default async function RecipePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const recipe = await getPublicRecipe((await params).slug);
  if (!recipe) notFound();
  return (
    <main
      id="main-content"
      className="recipe-detail home-container"
      tabIndex={-1}
    >
      <Link className="text-link" href="/#recipes">
        ← All recipes
      </Link>
      <header className="recipe-detail-heading">
        <span className="eyebrow">
          {recipe.categories[0]} · {recipe.author}
        </span>
        <h1>{recipe.title}</h1>
        <p>{recipe.description}</p>
        <dl className="recipe-facts glass">
          <div>
            <dt>Prep</dt>
            <dd>{recipe.prepMinutes} min</dd>
          </div>
          <div>
            <dt>Cook</dt>
            <dd>{recipe.cookMinutes} min</dd>
          </div>
          <div>
            <dt>Serves</dt>
            <dd>{recipe.servings}</dd>
          </div>
          <div>
            <dt>Difficulty</dt>
            <dd>{recipe.difficulty.toLowerCase()}</dd>
          </div>
        </dl>
      </header>
      <figure>
        <div className="recipe-cover">
          <Image
            src={recipe.image}
            alt={recipe.title}
            fill
            sizes="(max-width: 900px) 100vw, 1100px"
            priority
          />
        </div>
        {recipe.coverImageIsAi && (
          <figcaption>
            AI-generated illustration. Your finished dish may look different.
          </figcaption>
        )}
      </figure>
      <div className="recipe-instructions">
        <section className="glass">
          <h2>Ingredients</h2>
          <p>For {recipe.servings} servings</p>
          <ul>
            {recipe.ingredients.map((item) => (
              <li key={item.id}>
                <strong>
                  {item.amount} {item.unit}
                </strong>{" "}
                {item.name}
                {item.note && <small> — {item.note}</small>}
                {item.isOptional && <small> (optional)</small>}
              </li>
            ))}
          </ul>
        </section>
        <section className="glass">
          <h2>Let’s cook</h2>
          <ol>
            {recipe.steps.map((step) => (
              <li key={step.id}>
                <span>{String(step.position + 1).padStart(2, "0")}</span>
                <p>{step.instruction}</p>
              </li>
            ))}
          </ol>
        </section>
      </div>
    </main>
  );
}
