export type RecipePreview = {
  id: string;
  slug: string;
  isEditorial: boolean;
  isVerified: boolean;
  title: string;
  description: string;
  image: string;
  imageAlt: string;
  author: string;
  authorUsername: string | null;
  authorAvatar: string | null;
  initials: string;
  minutes: number;
  likeCount: number;
  commentCount: number;
  categories: readonly string[];
};
