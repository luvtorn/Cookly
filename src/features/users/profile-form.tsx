"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { profileSchema, type ProfileInput } from "./schema";
import { updateProfileAction, uploadAvatarAction } from "./actions";
import { useI18n } from "@/lib/i18n/context";

export function ProfileForm({
  initial,
  avatarUrl,
}: {
  initial: ProfileInput;
  avatarUrl: string | null;
}) {
  const router = useRouter();
  const { t } = useI18n();
  const locked = useRef(false);
  const [avatar, setAvatar] = useState(avatarUrl);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<ProfileInput>({
    resolver: zodResolver(profileSchema),
    defaultValues: initial,
  });
  const pending = uploading || isSubmitting;
  return (
    <form
      className="profile-form glass"
      aria-busy={pending}
      onSubmit={(event) =>
        void handleSubmit(async (data) => {
          if (locked.current) return;
          locked.current = true;
          setMessage("");
          try {
            const result = await updateProfileAction(data);
            setMessage(result.success ? t("profile.updated") : result.message);
            if (result.success) router.refresh();
          } catch {
            setMessage(t("auth.genericError"));
          } finally {
            locked.current = false;
          }
        })(event)
      }
      noValidate
    >
      <fieldset disabled={pending}>
        <div className="profile-avatar-editor">
          <div className="profile-avatar">
            {avatar ? (
              <Image
                src={avatar}
                alt={t("profile.chooseAvatar")}
                fill
                sizes="144px"
              />
            ) : (
              <span aria-hidden="true">You</span>
            )}
          </div>
          <label className="button-secondary">
            {uploading ? t("profile.uploading") : t("profile.chooseAvatar")}
            <input
              className="sr-only"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={async (event) => {
                const file = event.target.files?.[0];
                event.target.value = "";
                if (!file || locked.current) return;
                if (file.size > 3 * 1024 * 1024) {
                  setMessage("Choose an image up to 3 MiB.");
                  return;
                }
                locked.current = true;
                setUploading(true);
                setMessage("");
                try {
                  const form = new FormData();
                  form.set("file", file);
                  const result = await uploadAvatarAction(form);
                  if (result.success) {
                    setAvatar(result.url);
                    setValue("avatarReceipt", result.receipt, {
                      shouldDirty: true,
                    });
                    setMessage("Avatar uploaded. Save to use it on Cookly.");
                  } else setMessage(result.message);
                } finally {
                  locked.current = false;
                  setUploading(false);
                }
              }}
            />
          </label>
          <small>{t("profile.avatarHelp")}</small>
        </div>
        <label>
          {t("auth.displayName")}
          <input {...register("displayName")} maxLength={80} />
          {errors.displayName ? (
            <small className="field-error">{errors.displayName.message}</small>
          ) : null}
        </label>
        <label>
          {t("auth.username")}
          <input
            {...register("username")}
            maxLength={30}
            autoCapitalize="none"
          />
          {errors.username ? (
            <small className="field-error">{errors.username.message}</small>
          ) : null}
        </label>
        <label>
          {t("profile.bio")}
          <textarea {...register("bio")} maxLength={500} rows={5} />
        </label>
        <label>
          {t("profile.location")}
          <input {...register("location")} maxLength={120} />
        </label>
        <button className="button-primary" disabled={pending}>
          {pending ? t("profile.saving") : t("profile.save")}
        </button>
      </fieldset>
      <p role="status" aria-live="polite">
        {message}
      </p>
    </form>
  );
}
