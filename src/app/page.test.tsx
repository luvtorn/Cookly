import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import Home from "@/app/(public)/page";

describe("Home", () => {
  it("shows an honest empty catalog without demo content or photographs", async () => {
    render(await Home({ searchParams: Promise.resolve({}) }));

    expect(
      screen.getByRole("heading", { level: 1, name: "Cook better, together." }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("searchbox", { name: "Search recipes" }),
    ).toBeVisible();
    expect(screen.queryAllByRole("article")).toHaveLength(0);
    expect(screen.queryAllByRole("img")).toHaveLength(0);
    expect(
      screen.queryByText(/Emma Chen|Miso Glazed Salmon|sample recipes/i),
    ).not.toBeInTheDocument();
    expect(screen.getByText("No recipes on the table yet")).toBeVisible();
    expect(
      screen.queryByRole("button", { name: /create recipe/i }),
    ).not.toBeInTheDocument();
  });

  it("shows an empty state and an escape route for no results", async () => {
    render(
      await Home({ searchParams: Promise.resolve({ q: "nothing-matches" }) }),
    );
    expect(screen.getByText("No recipes on the table yet")).toBeVisible();
    expect(
      screen.getAllByRole("link", { name: /Clear filters/ })[0],
    ).toHaveAttribute("href", "/#recipes");
  });
});
