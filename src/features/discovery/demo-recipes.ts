import { z } from "zod";

// Presentation fixtures only: not database seed content or editorial verification.
export type RecipePreview = {
  id: string;
  title: string;
  description: string;
  image: string;
  imageAlt: string;
  author: string;
  initials: string;
  minutes: number;
  categories: readonly string[];
};

export const featuredRecipe: RecipePreview = {
  id: "lemon-pasta",
  title: "Creamy Lemon Herb Pasta",
  description: "Bright, fresh, and ready in 20 minutes.",
  image: "/images/lemon-pasta.webp",
  imageAlt:
    "Tagliatelle with lemon zest, parmesan and fresh herbs in a ceramic bowl",
  author: "Emma Chen",
  initials: "EC",
  minutes: 20,
  categories: ["quick", "comfort", "global"],
};

export const demoRecipes: readonly RecipePreview[] = [
  {
    id: "salmon",
    title: "Miso Glazed Salmon",
    description: "Rich, savory, and simple.",
    image: "/images/salmon.webp",
    imageAlt: "Miso glazed salmon with sesame seeds on a bed of greens",
    author: "Daniel Kim",
    initials: "DK",
    minutes: 25,
    categories: ["quick", "global"],
  },
  {
    id: "pancakes",
    title: "Fluffy Banana Pancakes",
    description: "A cozy morning classic.",
    image: "/images/pancakes.webp",
    imageAlt: "Banana pancakes topped with berries and maple syrup",
    author: "Sophie Laurent",
    initials: "SL",
    minutes: 15,
    categories: ["quick", "comfort", "vegetarian", "desserts"],
  },
  {
    id: "grain-bowl",
    title: "Mediterranean Grain Bowl",
    description: "Fresh flavors, colorful ingredients.",
    image: "/images/grain-bowl.webp",
    imageAlt: "Quinoa bowl with avocado, tomatoes, chickpeas and cucumber",
    author: "Aisha Khan",
    initials: "AK",
    minutes: 20,
    categories: ["quick", "fresh", "vegetarian", "global"],
  },
  {
    id: "tomato-soup",
    title: "Roasted Tomato Soup",
    description: "Comfort in every spoonful.",
    image: "/images/tomato-soup.webp",
    imageAlt:
      "Roasted tomato soup topped with cream and basil, with crusty bread",
    author: "Marcus Lee",
    initials: "ML",
    minutes: 40,
    categories: ["comfort", "vegetarian"],
  },
];

export const previewQuerySchema = z.object({
  q: z.string().trim().max(100).catch(""),
  category: z
    .enum(["quick", "fresh", "comfort", "vegetarian", "desserts", "global"])
    .optional()
    .catch(undefined),
});

export function getPreviewRecipes(
  input: Record<string, string | string[] | undefined>,
) {
  const { q, category } = previewQuerySchema.parse(input);
  const isFiltered = Boolean(q || category);
  const recipes = (
    isFiltered ? [featuredRecipe, ...demoRecipes] : demoRecipes
  ).filter(
    (recipe) =>
      recipe.title.toLowerCase().includes(q.toLowerCase()) &&
      (!category || recipe.categories.includes(category)),
  );
  return { recipes, q, category, isFiltered };
}
