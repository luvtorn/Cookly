import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { getDb } from "@/lib/db/client";
import { publicCard, publicCardSelect } from "@/features/recipes/repository";
import { RecipeCard } from "@/features/discovery/recipe-card";
import { getI18n } from "@/lib/i18n/server";

type Props = { params: Promise<{ username: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const username = (await params).username.toLowerCase();
  const profile = await getDb().profile.findFirst({
    where: { username, user: { status: "ACTIVE" } },
    select: { displayName: true, bio: true },
  });
  return profile
    ? {
        title: profile.displayName,
        description:
          profile.bio ?? `Recipes shared by ${profile.displayName} on Cookly.`,
      }
    : { title: "Creator not found" };
}

export default async function CreatorProfile({ params }: Props) {
  const { locale, t } = await getI18n();
  const username = (await params).username.toLowerCase();
  const profile = await getDb().profile.findFirst({
    where: { username, user: { status: "ACTIVE" } },
    select: {
      displayName: true,
      username: true,
      bio: true,
      location: true,
      avatarUrl: true,
      createdAt: true,
      user: {
        select: {
          id: true,
          _count: { select: { followers: true, following: true } },
        },
      },
    },
  });
  if (!profile) notFound();
  const [recipes, recipeCount, likeCount] = await Promise.all([
    getDb().recipe.findMany({
      where: {
        authorId: profile.user.id,
        status: "PUBLISHED",
        isHidden: false,
        isEditorial: false,
      },
      select: publicCardSelect,
      orderBy: [{ publishedAt: "desc" }, { id: "desc" }],
      take: 12,
    }),
    getDb().recipe.count({
      where: {
        authorId: profile.user.id,
        status: "PUBLISHED",
        isHidden: false,
        isEditorial: false,
      },
    }),
    getDb().recipeLike.count({
      where: {
        recipe: {
          authorId: profile.user.id,
          status: "PUBLISHED",
          isHidden: false,
          isEditorial: false,
        },
      },
    }),
  ]);
  return (
    <main className="creator-profile home-container" id="main-content">
      <header className="creator-profile-hero glass">
        <div className="profile-avatar profile-avatar-large">
          {profile.avatarUrl ? (
            <Image
              src={profile.avatarUrl}
              alt={`${profile.displayName}'s avatar`}
              fill
              sizes="180px"
              priority
            />
          ) : (
            <span aria-hidden="true">
              {profile.displayName.slice(0, 2).toUpperCase()}
            </span>
          )}
        </div>
        <div className="creator-profile-copy">
          <p className="eyebrow">{t("profile.creator")}</p>
          <h1>{profile.displayName}</h1>
          <p className="profile-username">@{profile.username}</p>
          <p>{profile.bio ?? t("profile.defaultBio")}</p>
          <p className="profile-location">
            {profile.location ?? t("profile.locationHidden")} ·{" "}
            {t("profile.joined")}{" "}
            {profile.createdAt.toLocaleDateString(locale, {
              month: "short",
              year: "numeric",
              timeZone: "UTC",
            })}
          </p>
        </div>
        <dl className="profile-stats">
          <div>
            <dt>{t("profile.recipes")}</dt>
            <dd>{recipeCount}</dd>
          </div>
          <div>
            <dt>{t("profile.likes")}</dt>
            <dd>{likeCount}</dd>
          </div>
          <div>
            <dt>{t("profile.followers")}</dt>
            <dd>{profile.user._count.followers}</dd>
          </div>
          <div>
            <dt>{t("profile.following")}</dt>
            <dd>{profile.user._count.following}</dd>
          </div>
        </dl>
      </header>
      <section className="recipes-section" aria-labelledby="creator-recipes">
        <div className="section-heading">
          <div>
            <p className="eyebrow">{t("profile.fromKitchen")}</p>
            <h2 id="creator-recipes">
              {t("profile.recipes")} · {profile.displayName}
            </h2>
          </div>
        </div>
        {recipes.length ? (
          <div className="recipe-grid">
            {recipes.map((recipe) => (
              <RecipeCard key={recipe.id} recipe={publicCard(recipe)} />
            ))}
          </div>
        ) : (
          <div className="community-empty glass">
            <div>
              <h3>{t("profile.noRecipes")}</h3>
              <p>{t("profile.noRecipesDescription")}</p>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
