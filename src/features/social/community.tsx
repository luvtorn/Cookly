import { readComments } from "./repository";
import { Comments } from "./comments";

export async function Community({ recipeId }: { recipeId: string }) {
  const initial = await readComments({ recipeId }).catch(() => null);
  return <Comments recipeId={recipeId} initial={initial} />;
}
