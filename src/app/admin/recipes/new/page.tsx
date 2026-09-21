import { requireAdmin } from "@/lib/auth/session";
import { recipeOptions } from "@/features/recipes/repository";
import { RecipeEditor } from "@/features/recipes/recipe-editor";
export default async function NewRecipe() {
  await requireAdmin("/admin/recipes/new");
  return <RecipeEditor options={await recipeOptions()} />;
}
