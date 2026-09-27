import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ImageUploadControl } from "./image-upload-control";

describe("ImageUploadControl", () => {
  it("labels the native picker, shows the filename and permits selecting it again", async () => {
    const user = userEvent.setup();
    const onFile = vi.fn().mockResolvedValue(undefined);
    render(
      <ImageUploadControl
        label="Upload cover"
        pendingLabel="Uploading"
        pending={false}
        help="JPEG, PNG, WebP"
        onFile={onFile}
      />,
    );
    const input = screen.getByLabelText("Upload cover");
    const file = new File(["image"], "dinner.png", { type: "image/png" });
    await user.upload(input, file);
    expect(screen.getByText("dinner.png")).toBeVisible();
    await user.upload(input, file);
    expect(onFile).toHaveBeenCalledTimes(2);
  });
});
