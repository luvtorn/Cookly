import { expect, test } from "@playwright/test";

test.use({ video: "on" });

for (const width of [390, 768, 1100, 1448]) {
  test(`search has one stationary surface at ${width}px`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width, height: 740 });
    await page.route("**/api/search/recipes**", (route) =>
      route.fulfill({
        json: {
          items: Array.from({ length: 8 }, (_, index) => ({
            slug: `test-${index}`,
            title: `Lemon pasta with spinach and roasted vegetables ${index}`,
            image: "/images/lemon-pasta.webp",
            minutes: 25,
          })),
        },
      }),
    );
    for (const locale of ["en", "ru", "pl"]) {
      for (const theme of ["light", "dark"]) {
        await page.emulateMedia({
          colorScheme: theme === "dark" ? "dark" : "light",
        });
        await page.goto(`/${locale}${theme === "dark" ? "/recipes" : ""}`);
        await expect(page.locator("html")).toHaveClass(new RegExp(theme));
        const input = page.locator('input[name="q"]');
        await input.fill("sp");
        const panel = page.locator(".recipe-search-popover");
        await expect(page.getByRole("option")).toHaveCount(8);
        await expect(panel).toBeVisible();
        await expect(panel).toHaveCSS("overflow-y", "hidden");
        await page.keyboard.press("ArrowUp");
        await expect(page.getByRole("option").last()).toHaveAttribute(
          "aria-selected",
          "true",
        );
        await expect
          .poll(() =>
            page
              .getByRole("option")
              .last()
              .locator("img")
              .evaluate((image) => image.complete && image.naturalWidth > 0),
          )
          .toBe(true);
        const geometry = await panel.evaluate((element) => {
          const bounds = element.getBoundingClientRect();
          const selected = element
            .querySelector('[aria-selected="true"]')
            ?.getBoundingClientRect();
          const navigation = document.querySelector(
            ".mobile-bottom-navigation",
          );
          const navTop = navigation?.getClientRects().length
            ? navigation.getBoundingClientRect().top
            : innerHeight;
          return {
            top: bounds.top,
            bottom: bounds.bottom,
            navTop,
            selectedBottom: selected?.bottom ?? 0,
            hit: document
              .elementFromPoint(bounds.left + 20, bounds.top + 20)
              ?.outerHTML.slice(0, 300),
            above:
              document
                .elementFromPoint(bounds.left + 20, bounds.top + 20)
                ?.closest(".recipe-search-popover") === element,
            pageWidth: document.documentElement.scrollWidth,
            viewport: innerWidth,
          };
        });
        expect(geometry.top).toBeGreaterThanOrEqual(0);
        expect(geometry.bottom).toBeLessThanOrEqual(geometry.navTop);
        expect(geometry.selectedBottom).toBeLessThanOrEqual(
          geometry.bottom + 1,
        );
        expect(geometry.above, JSON.stringify(geometry)).toBe(true);
        expect(geometry.pageWidth).toBeLessThanOrEqual(geometry.viewport);
        if (locale === "ru")
          await page.screenshot({
            path: testInfo.outputPath(`search-${width}-${theme}.png`),
          });
        await page.keyboard.press("Escape");
        await expect(panel).toHaveCount(0);
      }
    }
  });
}

test("reduced motion removes search entrance and card stagger", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/en/recipes");
  await page.route("**/api/search/recipes**", (route) =>
    route.fulfill({ json: { items: [] } }),
  );
  await page.locator('input[name="q"]').fill("nothing");
  await expect(page.locator(".recipe-search-popover")).toHaveCSS(
    "animation-name",
    "none",
  );
  await page.keyboard.press("Escape");
  await expect(page.locator(".recipe-search-popover")).toHaveCount(0);
});
