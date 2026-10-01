import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

// RSC wrapper is verified in database/browser tests; jsdom renders its children.
vi.mock("@/features/social/social-scope", () => ({
  SocialScope: ({ children }: { children: React.ReactNode }) => children,
}));

vi.mock("@/features/discovery/home-hero", () => ({
  HomeHero: () => (
    <section>
      <h1>Cook better, together.</h1>
      <label>
        Search recipes
        <select defaultValue="">
          <option value="">Search recipes</option>
        </select>
      </label>
    </section>
  ),
}));

vi.mock("@/components/shared/empty-state", () => ({
  EmptyState: () => <h3>No recipes on the table yet</h3>,
}));

import Home from "@/app/(public)/page";
import Catalog from "@/app/(public)/recipes/page";

describe("Home", () => {
  it("shows an honest empty catalog without demo content or photographs", async () => {
    render(await Home({ searchParams: Promise.resolve({}) }));

    expect(
      screen.getByRole("heading", { level: 1, name: "Cook better, together." }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("combobox", { name: "Search recipes" }),
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
      await Catalog({
        searchParams: Promise.resolve({ q: "nothing-matches" }),
      }),
    );
    expect(screen.getByText("No recipes found")).toBeVisible();
    expect(
      screen.getAllByRole("link", { name: /Clear filters \(1\)/i })[0],
    ).toHaveAttribute("href", "/en/recipes");
  });
});
