import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import {
  ProfileEditButton,
  ProfileEditPanel,
  ProfileEditProvider,
} from "./profile-edit-controls";

describe("ProfileEditControls", () => {
  it("opens the form under the profile and restores focus when closed", async () => {
    const user = userEvent.setup();
    render(
      <ProfileEditProvider>
        <ProfileEditButton />
        <ProfileEditPanel>
          <input aria-label="Display name" />
        </ProfileEditPanel>
      </ProfileEditProvider>,
    );
    const trigger = screen.getByRole("button", { name: "Edit profile" });
    expect(
      screen.queryByRole("textbox", { name: "Display name" }),
    ).not.toBeInTheDocument();
    await user.click(trigger);
    expect(screen.getByRole("textbox", { name: "Display name" })).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Close" }));
    expect(
      screen.queryByRole("textbox", { name: "Display name" }),
    ).not.toBeInTheDocument();
    await waitFor(() => expect(trigger).toHaveFocus());
  });
});
