"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { profileSchema, type ProfileInput } from "./schema";
import { updateProfileAction, uploadAvatarAction } from "./actions";
import { useI18n } from "@/lib/i18n/context";
import { ImageUploadControl } from "@/components/shared/image-upload-control";

export function ProfileForm({
  initial,
  avatarUrl,
}: {
  initial: ProfileInput;
  avatarUrl: string | null;
}) {
  const router = useRouter();
  const { t, href } = useI18n();
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
            setMessage(
              result.success ? t("profile.updated") : t("profile.saveError"),
            );
            if (result.success) {
              if (result.profile.username !== initial.username) {
                router.replace(href(`/u/${result.profile.username}`));
              } else {
                router.refresh();
              }
            }
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
              <span aria-hidden="true">{t("profile.you")}</span>
            )}
          </div>
          <ImageUploadControl
            label={t("profile.chooseAvatar")}
            pendingLabel={t("profile.uploading")}
            pending={pending}
            help={t("profile.avatarHelp")}
            onFile={async (file) => {
              if (locked.current) return;
              if (file.size > 3 * 1024 * 1024) {
                setMessage(t("editor.imageSizeError"));
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
                  setMessage(t("profile.uploaded"));
                } else setMessage(t("editor.uploadError"));
              } catch {
                setMessage(t("editor.uploadError"));
              } finally {
                locked.current = false;
                setUploading(false);
              }
            }}
          />
        </div>
        <label>
          {t("auth.displayName")}
          <input {...register("displayName")} maxLength={80} />
          {errors.displayName ? (
            <small className="field-error">{t("profile.nameHint")}</small>
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
            <small className="field-error">{t("profile.usernameHint")}</small>
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
