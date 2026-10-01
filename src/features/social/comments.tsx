"use client";
import Image from "next/image";
import Link from "next/link";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/lib/i18n/context";
import { useToast } from "@/components/shared/toast-provider";
import { SignInLink } from "@/features/auth/sign-in-link";
import { changeCommentAction, loadCommentsAction } from "./actions";
import {
  commentBody,
  type CommentPage,
  type CommentView,
  type SocialErrorCode,
} from "./schema";
import { useSocial } from "./social-provider";

export function Comments({
  recipeId,
  initial,
}: {
  recipeId: string;
  initial: CommentPage | null;
}) {
  const { t, locale, href } = useI18n();
  const { viewer } = useSocial();
  const notify = useToast();
  const router = useRouter();
  const [page, setPage] = useState(initial);
  const [body, setBody] = useState("");
  const [editing, setEditing] = useState<CommentView | null>(null);
  const [draft, setDraft] = useState("");
  const [confirm, setConfirm] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const locked = useRef(false);
  const [error, setError] = useState<SocialErrorCode | null>(
    initial ? null : "FAILED",
  );
  const [previousInitial, setPreviousInitial] = useState(initial);
  if (initial !== previousInitial) {
    setPreviousInitial(initial);
    setPage(initial);
  }
  function focusControl(id: string) {
    requestAnimationFrame(() =>
      document.getElementById(id)?.focus({ preventScroll: true }),
    );
  }

  async function load(more = false) {
    if (locked.current) return;
    locked.current = true;
    setPending(true);
    setError(null);
    try {
      const result = await loadCommentsAction({
        recipeId,
        cursor: more ? (page?.cursor ?? undefined) : undefined,
      });
      if (!result.success) {
        setError(result.code);
        return;
      }
      setPage((previous) =>
        more && previous
          ? {
              ...result.data,
              items: [
                ...previous.items,
                ...result.data.items.filter(
                  (item) => !previous.items.some((old) => old.id === item.id),
                ),
              ],
            }
          : result.data,
      );
      if (!more) {
        setEditing(null);
        setConfirm(null);
      }
    } catch {
      setError("FAILED");
    } finally {
      locked.current = false;
      setPending(false);
    }
  }
  async function submit(
    operation: "create" | "edit" | "delete",
    comment?: CommentView,
  ) {
    if (locked.current) return;
    const text = operation === "create" ? body : draft;
    if (operation !== "delete" && !commentBody.safeParse(text).success) {
      setError("INVALID");
      return;
    }
    locked.current = true;
    setPending(true);
    setError(null);
    try {
      const result = await changeCommentAction({
        operation,
        recipeId,
        id: comment?.id,
        body: text,
        updatedAt: comment?.updatedAt,
      });
      if (!result.success) {
        setError(result.code);
        return;
      }
      if (operation === "create") setBody("");
      setEditing(null);
      setConfirm(null);
      notify(
        operation === "create"
          ? "social.posted"
          : operation === "edit"
            ? "social.updated"
            : "social.deleted",
      );
      const fresh = await loadCommentsAction({ recipeId });
      if (fresh.success) setPage(fresh.data);
      else setError(fresh.code);
      router.refresh();
      focusControl(
        operation === "edit" && comment
          ? `edit-comment-${comment.id}`
          : "new-comment",
      );
    } catch {
      setError("FAILED");
    } finally {
      locked.current = false;
      setPending(false);
    }
  }
  return (
    <section
      className="recipe-community glass"
      aria-labelledby="community"
      data-recipe-reveal
    >
      <header>
        <div>
          <p className="eyebrow">{t("recipe.communityEyebrow")}</p>
          <h2 id="community">{t("recipe.community")}</h2>
        </div>
        <p>
          {t("recipe.comments")} · {page?.count ?? "—"}
        </p>
      </header>
      {viewer ? (
        <form
          className="comment-form"
          onSubmit={(event) => {
            event.preventDefault();
            void submit("create");
          }}
        >
          <label htmlFor="new-comment">{t("social.commentLabel")}</label>
          <textarea
            id="new-comment"
            rows={3}
            maxLength={1500}
            required
            value={body}
            disabled={pending}
            onChange={(event) => setBody(event.target.value)}
            aria-describedby="comment-length"
          />
          <div className="comment-form-footer">
            <span id="comment-length">{body.length}/1500</span>
            <button
              className="button-primary"
              disabled={pending || !body.trim()}
            >
              {t(pending ? "social.pending" : "social.addComment")}
            </button>
          </div>
        </form>
      ) : (
        <SignInLink label={t("social.signIn")} />
      )}
      {error && (
        <div className="social-error" role="alert">
          <p>{t(`social.error.${error}`)}</p>
          {error === "AUTH" ? (
            <SignInLink />
          ) : (
            <button
              type="button"
              className="button-secondary"
              disabled={pending}
              onClick={() => void load()}
            >
              {t("social.retry")}
            </button>
          )}
        </div>
      )}
      {page && !page.items.length && (
        <p className="comments-empty">{t("recipe.noComments")}</p>
      )}
      <ol className="comment-preview-list">
        {page?.items.map((comment) => (
          <li key={comment.id}>
            <div className="avatar" aria-hidden="true">
              {comment.avatar ? (
                <Image src={comment.avatar} alt="" width={34} height={34} />
              ) : (
                comment.author.slice(0, 2).toUpperCase()
              )}
            </div>
            <div className="comment-content">
              <div className="comment-author">
                {comment.username ? (
                  <Link href={href(`/u/${comment.username}`)}>
                    {comment.author}
                  </Link>
                ) : (
                  <span>{comment.author}</span>
                )}
                <time dateTime={comment.createdAt}>
                  {new Date(comment.createdAt).toLocaleDateString(locale, {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                    timeZone: "UTC",
                  })}
                </time>
                {comment.updatedAt !== comment.createdAt && (
                  <span className="comment-edited">{t("social.edited")}</span>
                )}
              </div>
              {editing?.id === comment.id ? (
                <form
                  className="comment-form"
                  onSubmit={(event) => {
                    event.preventDefault();
                    void submit("edit", editing);
                  }}
                >
                  <label htmlFor={`comment-${comment.id}`}>
                    {t("social.commentLabel")}
                  </label>
                  <textarea
                    id={`comment-${comment.id}`}
                    autoFocus
                    rows={3}
                    maxLength={1500}
                    required
                    value={draft}
                    disabled={pending}
                    onChange={(event) => setDraft(event.target.value)}
                  />
                  <div className="comment-controls">
                    <button
                      className="button-primary"
                      disabled={pending || !draft.trim()}
                    >
                      {t(pending ? "social.pending" : "social.update")}
                    </button>
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => {
                        setEditing(null);
                        focusControl(`edit-comment-${comment.id}`);
                      }}
                    >
                      {t("social.cancel")}
                    </button>
                  </div>
                </form>
              ) : (
                <p className="comment-body">{comment.body}</p>
              )}
              {comment.canEdit && editing?.id !== comment.id && (
                <div className="comment-controls">
                  {confirm === comment.id ? (
                    <>
                      <span>{t("social.confirmDelete")}</span>
                      <button
                        id={`delete-confirm-${comment.id}`}
                        type="button"
                        disabled={pending}
                        onClick={() => void submit("delete", comment)}
                      >
                        {t("social.delete")}
                      </button>
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() => {
                          setConfirm(null);
                          focusControl(`delete-comment-${comment.id}`);
                        }}
                      >
                        {t("social.cancel")}
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        id={`edit-comment-${comment.id}`}
                        type="button"
                        disabled={pending}
                        onClick={() => {
                          setEditing(comment);
                          setDraft(comment.body);
                          setConfirm(null);
                        }}
                      >
                        {t("social.edit")}
                      </button>
                      <button
                        id={`delete-comment-${comment.id}`}
                        type="button"
                        disabled={pending}
                        onClick={() => {
                          setConfirm(comment.id);
                          focusControl(`delete-confirm-${comment.id}`);
                        }}
                      >
                        {t("social.delete")}
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          </li>
        ))}
      </ol>
      {page?.cursor && (
        <button
          className="button-secondary"
          disabled={pending}
          onClick={() => void load(true)}
        >
          {t(pending ? "social.pending" : "social.more")}
        </button>
      )}
    </section>
  );
}
