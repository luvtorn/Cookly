import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import Home from "@/app/(public)/page";

describe("Home", () => {
  it("shows the discovery-first preview and four sample recipe cards", async () => {
    render(await Home({ searchParams: Promise.resolve({}) }));

    expect(
      screen.getByRole("heading", { level: 1, name: "Cook better, together." }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("searchbox", { name: "Search sample recipes" }),
    ).toBeVisible();
    expect(screen.getAllByRole("article")).toHaveLength(5);
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
