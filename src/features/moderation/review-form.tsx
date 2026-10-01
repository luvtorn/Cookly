"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { reviewRecipeAction } from "./actions";
import { GlassSelect } from "@/components/shared/glass-select";
import { verificationLabels, type ReviewStatus } from "./constants";

export function ReviewForm({
  recipeId,
  updatedAt,
  currentStatus,
}: {
  recipeId: string;
  updatedAt: string;
  currentStatus: ReviewStatus;
}) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState("");
  const router = useRouter();
  const [targetStatus, setTargetStatus] = useState<string>(currentStatus);
  return (
    <form
      className="verification-form"
      aria-busy={pending}
      onSubmit={(event) => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        const note = String(form.get("note") ?? "");
        const creatorMessage = String(form.get("creatorMessage") ?? "");
        if (targetStatus !== "VERIFIED" && !creatorMessage.trim()) {
          setMessage("Please explain to the author what needs to change.");
          return;
        }
        if (
          currentStatus === "VERIFIED" &&
          targetStatus !== "VERIFIED" &&
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
              targetStatus,
              note,
              creatorMessage,
            });
            setMessage(result.message);
            if (result.success) router.refresh();
          } catch {
            setMessage("Unable to save the review. Please try again.");
          }
        });
      }}
    >
      <p>Current status: {verificationLabels[currentStatus]}</p>
      <div className="glass-select-field">
        <span>New verification status</span>
        <GlassSelect
          ariaLabel="New verification status"
          value={targetStatus}
          onChange={setTargetStatus}
          disabled={pending}
          options={Object.entries(verificationLabels).map(([value, label]) => ({
            value,
            label,
          }))}
        />
      </div>
      <label>
        Message to author
        <textarea
          name="creatorMessage"
          maxLength={1000}
          rows={3}
          disabled={pending}
        />
      </label>
      <p>
        Visible only to the author and administrators. Required when requesting
        changes, reopening or clearing verification.
      </p>
      <label>
        Private review note
        <textarea name="note" maxLength={1000} rows={3} disabled={pending} />
      </label>
      <p>Private notes are never shown to the author.</p>
      <div className="verification-actions">
        <button
          className="button-primary"
          disabled={pending || targetStatus === currentStatus}
        >
          Save verification status
        </button>
      </div>
      <p role="status" aria-live="polite">
        {pending ? "Saving review…" : message}
      </p>
    </form>
  );
}
