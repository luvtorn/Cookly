import { z } from "zod";
import { searchRecipeSuggestions } from "@/features/recipes/repository";

const querySchema = z.string().trim().min(2).max(100);

export async function GET(request: Request) {
  const parsed = querySchema.safeParse(
    new URL(request.url).searchParams.get("q"),
  );
  if (!parsed.success) return Response.json({ items: [] });
  try {
    const recipes = await searchRecipeSuggestions(parsed.data);
    return Response.json({
      items: recipes.map((recipe) => ({
        slug: recipe.slug,
        title: recipe.title,
        image: recipe.coverImageUrl,
        minutes: recipe.prepMinutes + recipe.cookMinutes,
      })),
    });
  } catch {
    return Response.json({ items: [] }, { status: 503 });
  }
}
