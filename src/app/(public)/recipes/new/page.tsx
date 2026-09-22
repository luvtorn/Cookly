import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { recipeOptions } from "@/features/recipes/repository";
import { RecipeEditor } from "@/features/recipes/recipe-editor";
import { getRequestLocale } from "@/lib/i18n/server";
import { localizePath } from "@/lib/i18n/config";

export const metadata: Metadata = {
  title: "Create a recipe",
  robots: { index: false, follow: false },
};

export default async function NewCommunityRecipe() {
  const locale = await getRequestLocale();
  const user = await requireUser(localizePath(locale, "/recipes/new"));
  if (user.role === "ADMIN") redirect("/admin/recipes/new");
  return (
    <main className="creator-page home-container" id="main-content">
      <RecipeEditor mode="creator" options={await recipeOptions()} />
    </main>
  );
}
