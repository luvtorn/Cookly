import { expect, test } from "@playwright/test";

test("opens the Home preview with local images and no hydration errors", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Cook better, together." }),
  ).toBeVisible();
  await expect(page.locator(".recipe-card")).toHaveCount(4);
  await expect(
    page.getByText("Design preview · Sample content & imagery"),
  ).toBeVisible();
  for (const image of await page.locator("main img").all()) {
    await image.scrollIntoViewIfNeeded();
    await expect
      .poll(() =>
        image.evaluate(
          (element: HTMLImageElement) =>
            element.complete && element.naturalWidth > 0,
        ),
      )
      .toBe(true);
  }
  expect(errors).toEqual([]);
});

test("search, categories, empty state and clearing filters work", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("searchbox").fill("salmon");
  await page.getByRole("button", { name: "Search recipes" }).click();
  await expect(page.locator(".recipe-card")).toHaveCount(1);
  await expect(page.locator(".recipe-card")).toContainText(
    "Miso Glazed Salmon",
  );
  await page.getByRole("searchbox").fill("not-in-this-demo");
  await page.getByRole("button", { name: "Search recipes" }).click();
  await expect(page.getByText("No recipes on the table yet")).toBeVisible();
  await page.getByRole("link", { name: "Clear filters" }).first().click();
  await expect(page.locator(".recipe-card")).toHaveCount(4);
  await page
    .locator("#categories")
    .getByRole("link", { name: "Vegetarian" })
    .click();
  await expect(page.locator(".recipe-card")).toHaveCount(3);
});

test("theme respects the system and persists an override", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "dark" });
  await page.goto("/");
  await expect(page.locator("html")).toHaveClass(/dark/);
  await page.getByRole("button", { name: "Toggle color theme" }).click();
  await expect(page.locator("html")).toHaveClass(/light/);
  await page.reload();
  await expect(page.locator("html")).toHaveClass(/light/);
});

test("preview dialogs support keyboard dismissal and restore focus", async ({
  page,
}) => {
  await page.goto("/");
  const signIn = page.getByRole("button", { name: "Sign in" });
  await signIn.click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Close preview" }),
  ).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  await expect(
    page.getByRole("button", { name: "Keep exploring" }),
  ).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(signIn).toBeFocused();
  await page.getByRole("button", { name: "Miso Glazed Salmon" }).click();
  await expect(page.getByRole("dialog")).toContainText(
    "Full ingredients and cooking instructions",
  );
  await page.getByRole("button", { name: "Keep exploring" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
});

test("mobile navigation works with reduced motion and keyboard", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await page.keyboard.press("Tab");
  await expect(
    page.getByRole("link", { name: "Skip to content" }),
  ).toBeFocused();
  const toggle = page.getByRole("button", {
    name: /^(Open|Close) navigation$/,
  });
  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-expanded", "true");
  await page
    .getByRole("navigation", { name: "Mobile navigation" })
    .getByRole("link", { name: "Pantry" })
    .focus();
  await page.keyboard.press("Escape");
  await expect(toggle).toBeFocused();
  await expect(
    page.getByRole("navigation", { name: "Mobile navigation" }),
  ).toHaveCount(0);
  await toggle.click();
  await page
    .getByRole("navigation", { name: "Mobile navigation" })
    .getByRole("link", { name: "Pantry" })
    .click();
  await expect(page).toHaveURL(/#pantry$/);
  await expect(
    page.getByRole("heading", { name: "What’s in your fridge?" }),
  ).toBeInViewport();
});

for (const width of [320, 390, 768, 1024, 1448]) {
  test(`layout fits ${width}px in both themes`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 1086 });
    await page.emulateMedia({ reducedMotion: "reduce", colorScheme: "light" });
    await page.goto("/");
    await page.evaluate(() => document.fonts.ready);
    for (const theme of ["light", "dark"]) {
      if (theme === "dark")
        await page.getByRole("button", { name: "Toggle color theme" }).click();
      await expect(page.locator("html")).toHaveClass(new RegExp(theme));
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth,
        ),
      ).toBe(true);
      await page.screenshot({
        path: testInfo.outputPath(`home-${width}-${theme}.png`),
        fullPage: true,
      });
    }
  });
}

test("unknown routes show the branded 404", async ({ page }) => {
  const response = await page.goto("/not-a-real-recipe");
  expect(response?.status()).toBe(404);
  await expect(
    page.getByRole("heading", { name: "This page isn’t on the menu." }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Back to Home" }).click();
  await expect(
    page.getByRole("heading", { name: "Cook better, together." }),
  ).toBeVisible();
});

test("long preview content wraps and long searches stay usable", async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 320, height: 844 });
  await page.goto("/");
  // Wait for hydration before modifying the DOM, otherwise React can replace the fixture.
  await page.getByRole("button", { name: "Toggle color theme" }).click();
  await expect(page.locator("html")).toHaveClass(/dark/);
  // Presentation stress fixture only; this does not change stored recipe content.
  await page
    .locator(".recipe-card h3 button")
    .first()
    .evaluate((element) => {
      element.textContent = "Averylongrecipetitle".repeat(7);
    });
  await expect(page.locator(".recipe-card h3 button").first()).toHaveText(
    "Averylongrecipetitle".repeat(7),
  );
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: testInfo.outputPath("long-title-mobile.png"),
    fullPage: true,
  });
  await expect(page.locator(".recipe-card h3 button").first()).toHaveText(
    "Averylongrecipetitle".repeat(7),
  );
  await page.getByRole("searchbox").fill("x".repeat(100));
  await page.getByRole("button", { name: "Search recipes" }).click();
  await expect(page.getByText("No recipes on the table yet")).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: testInfo.outputPath("empty-search-mobile.png"),
    fullPage: true,
  });
});
