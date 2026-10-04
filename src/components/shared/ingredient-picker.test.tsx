import { useState } from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, it, vi } from "vitest";
import { IngredientPicker } from "./ingredient-picker";
afterEach(() => vi.unstubAllGlobals());
function Picker({ create }: { create?: () => void }) {
  const [value, setValue] = useState("");
  return (
    <>
      <IngredientPicker
        value={value}
        onChange={setValue}
        onSelect={(item) => setValue(item.name)}
        onCreate={create}
      />
      <button>Outside</button>
    </>
  );
}
it("selects with keyboard and closes loading results on Escape without reopening", async () => {
  let resolve: (value: unknown) => void = () => {};
  vi.stubGlobal(
    "fetch",
    vi.fn(
      () =>
        new Promise((r) => {
          resolve = r;
        }),
    ),
  );
  const user = userEvent.setup();
  render(<Picker />);
  const input = screen.getByRole("combobox");
  await user.type(input, "to");
  await waitFor(() => expect(fetch).toHaveBeenCalled());
  await user.keyboard("{Escape}");
  resolve({
    ok: true,
    json: async () => ({
      items: [{ id: "t", name: "tomato", recipeCount: 1 }],
    }),
  });
  await waitFor(() => expect(input).toHaveAttribute("aria-expanded", "false"));
  await user.click(screen.getByText("Outside"));
  await user.click(input);
  await screen.findByRole("option");
  await user.keyboard("{ArrowDown}{Enter}");
  expect(input).toHaveValue("tomato");
  expect(input).toHaveAttribute("aria-expanded", "false");
});
it("shows honest empty state, preserves optional editor creation and closes on blur", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => ({ ok: true, json: async () => ({ items: [] }) })),
  );
  const user = userEvent.setup();
  const create = vi.fn();
  const { rerender } = render(<Picker />);
  await user.type(screen.getByRole("combobox"), "unknown");
  expect(await screen.findByText(/No ingredient found/)).toBeVisible();
  await user.click(screen.getByText("Outside"));
  expect(screen.queryByText(/No ingredient found/)).not.toBeInTheDocument();
  rerender(<Picker create={create} />);
  await user.click(screen.getByRole("combobox"));
  await user.click(await screen.findByRole("button", { name: /unknown/ }));
  expect(create).toHaveBeenCalledOnce();
});
