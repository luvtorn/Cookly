"use client";

import { Leaf, X } from "lucide-react";
import { useCallback, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

type PreviewNoticeProps = {
  children: ReactNode;
  title: string;
  description: string;
  className?: string;
  ariaLabel?: string;
};

export function PreviewNotice({
  children,
  title,
  description,
  className,
  ariaLabel,
}: PreviewNoticeProps) {
  const [isOpen, setIsOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const continueButton = useRef<HTMLButtonElement>(null);
  const openDialog = useCallback((node: HTMLDialogElement | null) => {
    node?.showModal();
  }, []);

  return (
    <>
      <button
        ref={trigger}
        type="button"
        className={className}
        aria-label={ariaLabel}
        onClick={() => setIsOpen(true)}
      >
        {children}
      </button>
      {isOpen &&
        createPortal(
          <dialog
            ref={openDialog}
            className="preview-dialog glass"
            aria-label={title}
            onKeyDown={(event) => {
              if (event.key !== "Tab") return;
              if (
                event.shiftKey &&
                document.activeElement === closeButton.current
              ) {
                event.preventDefault();
                continueButton.current?.focus();
              } else if (
                !event.shiftKey &&
                document.activeElement === continueButton.current
              ) {
                event.preventDefault();
                closeButton.current?.focus();
              }
            }}
            onClose={() => {
              setIsOpen(false);
              trigger.current?.focus();
            }}
          >
            <div className="dialog-content">
              <form method="dialog" className="dialog-close">
                <button
                  ref={closeButton}
                  className="icon-button"
                  aria-label="Close preview"
                >
                  <X size={20} aria-hidden="true" />
                </button>
              </form>
              <span className="notice-icon">
                <Leaf size={28} aria-hidden="true" />
              </span>
              <p className="eyebrow">Cookly preview</p>
              <h2>{title}</h2>
              <p className="muted-copy">{description}</p>
              <p className="preview-disclaimer">
                This is a design preview. No account, saved recipes, or pantry
                data is created.
              </p>
              <form method="dialog">
                <button ref={continueButton} className="button-primary">
                  Keep exploring <span aria-hidden="true">→</span>
                </button>
              </form>
            </div>
          </dialog>,
          document.body,
        )}
    </>
  );
}
