"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/lib/i18n/context";
import { requestVerificationAction } from "./request-action";

export type OwnerVerification = {
  id: string;
  status: string;
  isHidden: boolean;
  verificationStatus: "NONE" | "PENDING" | "VERIFIED" | "REJECTED";
  creatorMessage: string | null;
};
export function RequestReview({ recipe }: { recipe: OwnerVerification }) {
  const { t } = useI18n();
  const [pending, start] = useTransition();
  const [result, setResult] = useState<"sent" | "error" | "limit" | null>(null);
  const router = useRouter();
  return (
    <section
      className="owner-verification"
      aria-label={t(`verification.${recipe.verificationStatus}`)}
    >
      <strong>{t(`verification.${recipe.verificationStatus}`)}</strong>
      {recipe.creatorMessage && (
        <p className="verification-feedback">
          <b>{t("verification.feedback")}: </b>
          {recipe.creatorMessage}
        </p>
      )}
      {recipe.verificationStatus === "REJECTED" && (
        <p>{t("verification.editFirst")}</p>
      )}
      {recipe.status === "PUBLISHED" &&
        !recipe.isHidden &&
        recipe.verificationStatus === "NONE" && (
          <details>
            <summary>{t("verification.request")}</summary>
            <form
              aria-busy={pending}
              onSubmit={(event) => {
                event.preventDefault();
                const creatorNote = String(
                  new FormData(event.currentTarget).get("creatorNote") ?? "",
                );
                start(async () => {
                  try {
                    const response = await requestVerificationAction({
                      recipeId: recipe.id,
                      creatorNote,
                    });
                    setResult(response.success ? "sent" : response.code);
                    if (response.success) router.refresh();
                  } catch {
                    setResult("error");
                  }
                });
              }}
            >
              <label>
                {t("verification.note")}
                <textarea
                  name="creatorNote"
                  maxLength={500}
                  rows={3}
                  disabled={pending}
                />
              </label>
              <p>{t("verification.help")}</p>
              <button className="button-secondary" disabled={pending}>
                {t(pending ? "verification.pending" : "verification.request")}
              </button>
            </form>
          </details>
        )}
      <p role="status">{result ? t(`verification.${result}`) : ""}</p>
    </section>
  );
}
