import { expect, test } from "@playwright/test";

for (const theme of ["light", "dark"] as const) {
  test(`CSS fallback stays visible and interactive in ${theme}`, async ({
    page,
  }, testInfo) => {
    await page.emulateMedia({ colorScheme: theme, reducedMotion: "reduce" });
    await page.goto("/");
    const category = page.locator(".category-card").first();
    await category.hover();
    await expect(category).not.toHaveAttribute("data-lens", "ready");
    expect(
      await category.evaluate(
        (element) => getComputedStyle(element, "::before").backdropFilter,
      ),
    ).not.toContain("url(");
    await expect
      .poll(() =>
        category.evaluate(
          (element) => getComputedStyle(element, "::after").opacity,
        ),
      )
      .toBe("1");
    await page.screenshot({
      path: testInfo.outputPath(`home-${theme}.png`),
      fullPage: false,
    });
    await page.locator(".sign-in-button").click();
    await expect(page.locator(".auth-modal")).toHaveCSS("opacity", "1");
    await page
      .getByRole("navigation", { name: "Account access" })
      .getByRole("link", { name: "Create account" })
      .click();
    await expect(
      page.getByLabel("Display name", { exact: true }),
    ).toBeVisible();
    await page.screenshot({ path: testInfo.outputPath(`auth-${theme}.png`) });
    await page.keyboard.press("Escape");
    await expect(page).toHaveURL("/");
  });
}
