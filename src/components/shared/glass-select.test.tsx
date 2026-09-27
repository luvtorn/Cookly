import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { GlassSelect } from "./glass-select";

const options = [
  { value: "", label: "All categories" },
  { value: "soup", label: "Soup" },
  { value: "salad", label: "Salad" },
];

describe("GlassSelect", () => {
  it("opens upward when the trigger is close to the viewport bottom", async () => {
    const user = userEvent.setup();
    render(<GlassSelect ariaLabel="Category" options={options} />);
    const trigger = screen.getByRole("combobox");
    const height = vi
      .spyOn(HTMLElement.prototype, "scrollHeight", "get")
      .mockReturnValue(190);
    vi.spyOn(trigger, "getBoundingClientRect").mockReturnValue({
      top: 750,
      bottom: 796,
      left: 0,
      right: 200,
      width: 200,
      height: 46,
      x: 0,
      y: 750,
      toJSON: () => ({}),
    });
    await user.click(trigger);
    expect(screen.getByRole("listbox")).toHaveAttribute("data-side", "top");
    height.mockRestore();
    await user.keyboard("{Escape}");
    expect(trigger).toHaveFocus();
  });
  it("selects an option by keyboard, submits its value and closes on focus departure", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <form>
        <GlassSelect
          name="category"
          ariaLabel="Category"
          options={options}
          onChange={onChange}
        />
        <button type="button">Outside</button>
      </form>,
    );
    const trigger = screen.getByRole("combobox", { name: "Category" });
    trigger.focus();
    await user.keyboard("{ArrowDown}");
    expect(screen.getByRole("listbox", { name: "Category" })).toBeVisible();
    await user.keyboard("{ArrowDown}{Enter}");
    expect(trigger).toHaveTextContent("Soup");
    expect(onChange).toHaveBeenCalledWith("soup");
    expect(
      screen.queryByRole("listbox", { name: "Category" }),
    ).not.toBeInTheDocument();
    expect(screen.getByDisplayValue("soup")).toHaveAttribute(
      "name",
      "category",
    );
    await user.click(trigger);
    await user.click(screen.getByRole("button", { name: "Outside" }));
    expect(
      screen.queryByRole("listbox", { name: "Category" }),
    ).not.toBeInTheDocument();
  });
});
