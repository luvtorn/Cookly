import "server-only";
import { revalidatePath } from "next/cache";
export function refreshVerification(slug: string) {
  revalidatePath("/admin/recipes/[id]", "page");
  revalidatePath("/admin/verification/[id]/history", "page");
  for (const path of ["/admin", "/admin/verification", "/admin/recipes"])
    revalidatePath(path);
  for (const locale of ["en", "ru", "pl"]) {
    for (const path of [
      "",
      "/recipes",
      "/saved",
      "/my-recipes",
      `/recipes/${slug}`,
    ])
      revalidatePath(`/${locale}${path}`);
  }
  revalidatePath("/[locale]/(public)/my-recipes/[id]/edit", "page");
  revalidatePath("/[locale]/(public)/u/[username]", "page");
}
