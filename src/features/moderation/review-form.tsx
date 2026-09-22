"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { reviewRecipeAction } from "./actions";

export function ReviewForm({
  recipeId,
  updatedAt,
  isVerified,
}: {
  recipeId: string;
  updatedAt: string;
  isVerified: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState("");
  const router = useRouter();
  return (
    <form
      className="verification-form"
      aria-busy={pending}
      onSubmit={(event) => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        const submitter = (event.nativeEvent as SubmitEvent).submitter;
        const decision =
          submitter instanceof HTMLButtonElement ? submitter.value : "";
        const note = String(form.get("note") ?? "");
        if (decision !== "VERIFY" && !note.trim()) {
          setMessage("Please add a private reason.");
          return;
        }
        if (
          decision === "REVOKE" &&
          !window.confirm(
            "Remove the Cookly verified badge? The recipe will remain published.",
          )
        )
          return;
        startTransition(async () => {
          try {
            const result = await reviewRecipeAction({
              recipeId,
              updatedAt,
              decision,
              note,
            });
            setMessage(result.message);
            if (result.success) router.refresh();
          } catch {
            setMessage("Unable to save the review. Please try again.");
          }
        });
      }}
    >
      <label>
        Private review note
        <textarea name="note" maxLength={1000} rows={3} disabled={pending} />
      </label>
      <div className="verification-actions">
        {isVerified ? (
          <button
            className="button-secondary"
            value="REVOKE"
            disabled={pending}
          >
            Revoke verification
          </button>
        ) : (
          <>
            <button
              className="button-primary"
              value="VERIFY"
              disabled={pending}
            >
              Confirm verification
            </button>
            <button
              className="button-secondary"
              value="REJECT"
              disabled={pending}
            >
              Reject verification
            </button>
          </>
        )}
      </div>
      <p role="status" aria-live="polite">
        {pending ? "Saving review…" : message}
      </p>
    </form>
  );
}
