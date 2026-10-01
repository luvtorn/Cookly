import { getCurrentUser } from "@/lib/auth/session";
import { getDb } from "@/lib/db/client";
import { SocialProvider } from "./social-provider";

export async function SocialScope({
  recipes,
  children,
}: {
  recipes: { id: string; likeCount: number }[];
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  const ids = recipes.map((r) => r.id);
  let liked = new Set<string>();
  let saved = new Set<string>();
  let unavailable = false;
  if (user && ids.length) {
    try {
      const db = getDb();
      const [likes, favorites] = await Promise.all([
        db.recipeLike.findMany({
          where: { userId: user.id, recipeId: { in: ids } },
          select: { recipeId: true },
        }),
        db.favorite.findMany({
          where: { userId: user.id, recipeId: { in: ids } },
          select: { recipeId: true },
        }),
      ]);
      liked = new Set(likes.map((r) => r.recipeId));
      saved = new Set(favorites.map((r) => r.recipeId));
    } catch {
      unavailable = true;
    }
  }
  return (
    <SocialProvider
      viewer={user?.id ?? null}
      unavailable={unavailable}
      initial={Object.fromEntries(
        recipes.map((r) => [
          r.id,
          {
            isLiked: liked.has(r.id),
            isSaved: saved.has(r.id),
            likeCount: r.likeCount,
          },
        ]),
      )}
    >
      {children}
    </SocialProvider>
  );
}
