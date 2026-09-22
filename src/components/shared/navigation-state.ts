import { stripLocalePrefix } from "@/lib/i18n/config";

export function getNavigationState(pathname: string) {
  pathname = stripLocalePrefix(pathname);
  return {
    isHome: pathname === "/",
    isRecipes:
      pathname === "/recipes" ||
      (pathname.startsWith("/recipes/") && pathname !== "/recipes/new"),
    isIngredients: pathname === "/pantry",
    isCreate:
      pathname === "/recipes/new" || pathname.startsWith("/my-recipes/"),
    isEditor:
      pathname === "/recipes/new" || pathname.startsWith("/my-recipes/"),
  };
}
