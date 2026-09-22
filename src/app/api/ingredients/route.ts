import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/session";
import { searchIngredientSuggestions } from "@/features/recipes/repository";

const querySchema = z.string().trim().min(2).max(100);

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = querySchema.safeParse(
    new URL(request.url).searchParams.get("q"),
  );
  if (!parsed.success) return Response.json({ items: [] });
  try {
    return Response.json({
      items: await searchIngredientSuggestions(parsed.data),
    });
  } catch {
    return Response.json({ items: [] }, { status: 503 });
  }
}
