import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { I18nProvider } from "@/lib/i18n/context";
import { getMessages } from "@/lib/i18n/messages";
import { RecipeEditor } from "./recipe-editor";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), refresh: vi.fn() }),
}));
vi.mock("./actions", () => ({
  saveRecipeAction: vi.fn(),
  uploadCoverAction: vi.fn(),
}));
vi.mock("./creator-actions", () => ({
  saveUserRecipeAction: vi.fn(),
  uploadUserCoverAction: vi.fn(),
}));

describe("localized creator editor", () => {
  for (const locale of ["en", "ru", "pl"] as const) {
    it(`renders ${locale} guidance, upload and validation`, async () => {
      const messages = getMessages(locale);
      render(
        <I18nProvider locale={locale} messages={messages}>
          <RecipeEditor
            mode="creator"
            options={{
              categories: [{ id: "test", name: "Author category" }],
              cuisines: [],
              tags: [],
            }}
          />
        </I18nProvider>,
      );
      expect(
        screen.getByPlaceholderText(messages["editor.titlePlaceholder"]),
      ).toBeVisible();
      expect(screen.getByText(messages["editor.publishHelp"])).toBeVisible();
      expect(
        screen.getByLabelText(messages["editor.uploadCover"]),
      ).toHaveAttribute("type", "file");
      await userEvent
        .setup()
        .click(screen.getByRole("button", { name: messages["editor.save"] }));
      expect(screen.getByRole("status")).toHaveTextContent(
        messages["editor.checkFields"],
      );
      expect(
        screen.getAllByText(messages["editor.invalidField"]).length,
      ).toBeGreaterThan(0);
      expect(
        screen.getByText(messages["editor.ingredientRequired"]),
      ).toBeVisible();
    });
  }
});
