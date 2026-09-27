"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";
import { Pencil, X } from "lucide-react";

import { useI18n } from "@/lib/i18n/context";

type EditContext = {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  trigger: React.RefObject<HTMLButtonElement | null>;
};

const ProfileEditContext = createContext<EditContext | null>(null);

function useProfileEdit() {
  const context = useContext(ProfileEditContext);
  if (!context)
    throw new Error("Profile edit controls require their provider.");
  return context;
}

export function ProfileEditProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  return (
    <ProfileEditContext.Provider
      value={{
        isOpen,
        open: () => setIsOpen(true),
        close: () => {
          setIsOpen(false);
          requestAnimationFrame(() => trigger.current?.focus());
        },
        trigger,
      }}
    >
      {children}
    </ProfileEditContext.Provider>
  );
}

export function ProfileEditButton() {
  const { isOpen, open, trigger } = useProfileEdit();
  const { t } = useI18n();
  return (
    <button
      ref={trigger}
      type="button"
      className="button-secondary profile-edit-button"
      aria-expanded={isOpen}
      aria-controls="profile-edit-panel"
      onClick={open}
    >
      <Pencil size={17} aria-hidden="true" />
      {t("profile.edit")}
    </button>
  );
}

export function ProfileEditPanel({ children }: { children: React.ReactNode }) {
  const { isOpen, close } = useProfileEdit();
  const { t } = useI18n();
  const panel = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    panel.current?.focus({ preventScroll: true });
    panel.current?.scrollIntoView?.({ block: "start", behavior: "instant" });
  }, [isOpen]);

  return (
    <section
      ref={panel}
      id="profile-edit-panel"
      className="profile-edit-panel"
      aria-label={t("profile.edit")}
      tabIndex={-1}
      hidden={!isOpen}
    >
      {isOpen ? (
        <>
          <div className="profile-edit-panel-heading">
            <div>
              <h2>{t("profile.edit")}</h2>
              <p>{t("profile.description")}</p>
            </div>
            <button
              className="icon-button"
              type="button"
              aria-label={t("common.close")}
              onClick={close}
            >
              <X aria-hidden="true" />
            </button>
          </div>
          {children}
        </>
      ) : null}
    </section>
  );
}
