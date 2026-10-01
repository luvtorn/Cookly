"use client";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Bookmark, Heart } from "lucide-react";
import { useI18n } from "@/lib/i18n/context";
import { useToast } from "@/components/shared/toast-provider";
import { SignInLink } from "@/features/auth/sign-in-link";
import { reactionKey, useSocial, type CachedReaction } from "./social-provider";
import { setReactionAction } from "./actions";
import type { SocialErrorCode } from "./schema";

export function RecipeReactions({
  recipeId,
  likeCount,
  compact = false,
}: {
  recipeId: string;
  likeCount: number;
  compact?: boolean;
}) {
  const { t } = useI18n();
  const notify = useToast();
  const router = useRouter();
  const cache = useQueryClient();
  const { viewer, initial, unavailable } = useSocial();
  const key = reactionKey(viewer, recipeId);
  const { data } = useQuery<CachedReaction>({
    queryKey: key,
    enabled: false,
    initialData: initial[recipeId] ?? {
      isLiked: false,
      isSaved: false,
      likeCount,
    },
  });
  const [error, setError] = useState<SocialErrorCode | null>(null);
  async function change(kind: "like" | "save") {
    const previous = cache.getQueryData<CachedReaction>(key) ?? data;
    if (!viewer || previous.pending) return;
    const active = !(kind === "like" ? previous.isLiked : previous.isSaved);
    setError(null);
    cache.setQueryData(key, {
      ...previous,
      pending: true,
      ...(kind === "like"
        ? {
            isLiked: active,
            likeCount: Math.max(0, previous.likeCount + (active ? 1 : -1)),
          }
        : { isSaved: active }),
    });
    try {
      const result = await setReactionAction({ recipeId, kind, active });
      if (!result.success) {
        setError(result.code);
        cache.setQueryData(key, { ...previous, pending: false });
        return;
      }
      cache.setQueryData(key, result.data);
      if (kind === "save")
        notify(active ? "social.savedToast" : "social.removedToast");
      router.refresh();
    } catch {
      cache.setQueryData(key, { ...previous, pending: false });
      setError("FAILED");
    }
  }
  return (
    <div
      className={
        compact
          ? "recipe-reactions recipe-reactions--compact"
          : "recipe-reactions"
      }
    >
      {viewer ? (
        <>
          <button
            type="button"
            disabled={data.pending || unavailable}
            aria-pressed={data.isSaved}
            aria-label={t(data.isSaved ? "social.unsave" : "social.save")}
            title={t(data.isSaved ? "social.unsave" : "social.save")}
            onClick={() => void change("save")}
          >
            <Bookmark
              aria-hidden="true"
              fill={data.isSaved ? "currentColor" : "none"}
            />
            {!compact && (
              <span>{t(data.isSaved ? "social.unsave" : "social.save")}</span>
            )}
          </button>
          <button
            type="button"
            disabled={data.pending || unavailable}
            aria-pressed={data.isLiked}
            aria-label={t(data.isLiked ? "social.unlike" : "social.like")}
            title={t(data.isLiked ? "social.unlike" : "social.like")}
            onClick={() => void change("like")}
          >
            <Heart
              aria-hidden="true"
              fill={data.isLiked ? "currentColor" : "none"}
            />
            <span>{data.likeCount}</span>
          </button>
        </>
      ) : (
        <>
          <SignInLink
            className="reaction-guest"
            label={t("social.save")}
            ariaLabel={t("social.save")}
            icon="bookmark"
            compact={compact}
          />
          <SignInLink
            className="reaction-guest"
            label={String(likeCount)}
            ariaLabel={t("social.like")}
            icon="heart"
          />
        </>
      )}
      {(error || unavailable) && (
        <span role="alert" className="reaction-error">
          {t(`social.error.${error ?? "FAILED"}`)}
          {error === "AUTH" && <SignInLink />}
        </span>
      )}
    </div>
  );
}
