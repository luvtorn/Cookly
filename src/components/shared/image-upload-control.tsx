"use client";

import { useId, useState } from "react";
import { Upload } from "lucide-react";

/** Styled native file picker, shared by recipe covers and profile avatars. */
export function ImageUploadControl({
  label,
  pendingLabel,
  pending,
  help,
  onFile,
}: {
  label: string;
  pendingLabel: string;
  pending: boolean;
  help: string;
  onFile: (file: File) => Promise<void>;
}) {
  const id = useId();
  const [filename, setFilename] = useState("");
  return (
    <div className="image-upload-control">
      <label className="button-secondary image-upload-trigger">
        <Upload size={18} aria-hidden="true" />
        {pending ? pendingLabel : label}
        <input
          className="sr-only"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          aria-describedby={id}
          disabled={pending}
          onChange={async (event) => {
            const file = event.target.files?.[0];
            event.target.value = "";
            if (!file) return;
            setFilename(file.name);
            await onFile(file);
          }}
        />
      </label>
      <small id={id}>{help}</small>
      {filename && (
        <span className="image-upload-filename" title={filename}>
          {filename}
        </span>
      )}
    </div>
  );
}
