import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { RecipeSearchField } from "./recipe-search-field";

afterEach(() => vi.unstubAllGlobals());

function setup() {
  render(
    <>
      <RecipeSearchField id="search" />
      <button>Outside</button>
    </>,
  );
  const input = screen.getByRole("combobox");
  fireEvent.focus(input);
  fireEvent.change(input, { target: { value: "soup" } });
  return input;
}

describe("recipe suggestions", () => {
  it("closes empty results with Escape", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue({ ok: true, json: async () => ({ items: [] }) }),
    );
    const input = setup();
    await waitFor(() => expect(input).toHaveAttribute("aria-expanded", "true"));
    fireEvent.keyDown(input, { key: "Escape" });
    expect(input).toHaveAttribute("aria-expanded", "false");
  });

  it.each(["escape", "blur"])(
    "does not reopen after %s while a response is pending",
    async (action) => {
      let resolve: (value: unknown) => void = () => {};
      vi.stubGlobal(
        "fetch",
        vi.fn(
          () =>
            new Promise((done) => {
              resolve = done;
            }),
        ),
      );
      const input = setup();
      await waitFor(() => expect(fetch).toHaveBeenCalledOnce());
      if (action === "escape") fireEvent.keyDown(input, { key: "Escape" });
      else fireEvent.blur(input, { relatedTarget: screen.getByRole("button") });
      await act(async () =>
        resolve({ ok: true, json: async () => ({ items: [] }) }),
      );
      expect(input).toHaveAttribute("aria-expanded", "false");
    },
  );

  it("removes the active descendant when dismissed and separates scrolling from glass", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue({
          ok: true,
          json: async () => ({
            items: [
              {
                slug: "soup",
                title: "Soup",
                image: "/images/auth-food.webp",
                minutes: 20,
              },
            ],
          }),
        }),
    );
    const input = setup();
    const option = await screen.findByRole("option");
    fireEvent.keyDown(input, { key: "ArrowDown" });
    expect(input).toHaveAttribute("aria-activedescendant", option.id);
    expect(option.closest(".recipe-search-scroll")?.parentElement).toHaveClass(
      "glass",
    );
    fireEvent.keyDown(input, { key: "Escape" });
    expect(input).not.toHaveAttribute("aria-activedescendant");
  });
});
