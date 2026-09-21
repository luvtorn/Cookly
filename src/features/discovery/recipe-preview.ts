export type RecipePreview = {
  id: string;
  slug: string;
  isEditorial: boolean;
  title: string;
  description: string;
  image: string;
  imageAlt: string;
  author: string;
  initials: string;
  minutes: number;
  categories: readonly string[];
};
