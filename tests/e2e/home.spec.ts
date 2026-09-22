import { expect, test } from "@playwright/test";

test("Home is a quiet editorial introduction without offline demo content", async ({
  page,
}) => {
  const errors: string[] = [];
  const consoleErrors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  await page.goto("/");
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Cook better, together." }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "From Cookly" }),
  ).toBeVisible();
  await expect(page.locator(".recipe-card")).toHaveCount(0);
  await expect(page.locator("#pantry, #categories")).toHaveCount(0);
  await expect(
    page.getByRole("link", { name: "View all recipes" }),
  ).toHaveAttribute("href", "/en/recipes");
  expect(errors).toEqual([]);
  expect(consoleErrors.filter((message) => /hydrat/i.test(message))).toEqual(
    [],
  );
});

test("search moves to the catalog, legacy links translate and filters clear", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("combobox", { name: "Search recipes" }).fill("salmon");
  await page.getByRole("button", { name: "Search recipes" }).click();
  await expect(page).toHaveURL(/\/recipes\?q=salmon/);
  await expect(page.getByText("No recipes found")).toBeVisible();
  await page.getByRole("link", { name: /Clear filters \(1\)/i }).click();
  await expect(page).toHaveURL("/en/recipes");
  await expect(
    page.getByRole("combobox", { name: "Search recipes" }),
  ).toHaveValue("");
  await page.goto("/?category=vegetarian");
  await expect(page).toHaveURL("/en/recipes?tag=vegetarian");
  await expect(
    page.getByRole("list", { name: "Active filters" }),
  ).toContainText("vegetarian");
});

test("mobile dock exposes creation, profile sheet and active routes", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await page.keyboard.press("Tab");
  await expect(
    page.getByRole("link", { name: "Skip to content" }),
  ).toBeFocused();
  const nav = page.getByRole("navigation", { name: "Mobile navigation" });
  await expect(
    nav.getByRole("link", { name: "Home", exact: true }),
  ).toHaveAttribute("aria-current", "page");
  await expect(
    nav.getByRole("link", { name: "Ingredients", exact: true }),
  ).toHaveAttribute("href", "/en/pantry");
  await expect(
    nav.getByRole("link", { name: "Create a recipe", exact: true }),
  ).toHaveAttribute("href", "/en/recipes/new");
  const profile = nav.getByRole("link", { name: "Sign in" });
  await profile.click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(profile).toBeFocused();
  await nav.getByRole("link", { name: "Recipes", exact: true }).click();
  await expect(page).toHaveURL("/en/recipes");
  await expect(
    nav.getByRole("link", { name: "Recipes", exact: true }),
  ).toHaveAttribute("aria-current", "page");
});

test("theme persists an override", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "dark" });
  await page.goto("/");
  await expect(page.locator("html")).toHaveClass(/dark/);
  await page.getByRole("button", { name: "Toggle color theme" }).click();
  await page.reload();
  await expect(page.locator("html")).toHaveClass(/light/);
});

for (const width of [320, 390, 768, 1024, 1100, 1448]) {
  test(`Home and catalog fit ${width}px in both themes`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width, height: 1000 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    for (const theme of ["light", "dark"] as const) {
      await page.emulateMedia({ colorScheme: theme });
      for (const route of ["/", `/recipes?q=${"x".repeat(100)}`]) {
        await page.goto(route);
        await page.evaluate(() => document.fonts.ready);
        expect(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
        ).toBe(true);
        await page.screenshot({
          path: testInfo.outputPath(
            `${route === "/" ? "home" : "catalog"}-${width}-${theme}.png`,
          ),
          fullPage: true,
        });
      }
    }
  });
}

test("unknown routes retain the branded 404", async ({ page }) => {
  expect((await page.goto("/not-a-real-recipe"))?.status()).toBe(404);
  await expect(
    page.getByRole("heading", { name: "This page isn’t on the menu." }),
  ).toBeVisible();
});
