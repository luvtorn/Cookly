import { expect, test } from "@playwright/test";

test("button borders highlight on focus, with no idle animation", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/");
  const button = page.getByRole("button", { name: "Toggle color theme" });
  expect(
    await button.evaluate(
      (element) => getComputedStyle(element, "::after").animationName,
    ),
  ).toBe("none");
  await button.focus();
  await expect
    .poll(() =>
      button.evaluate(
        (element) => getComputedStyle(element, "::after").opacity,
      ),
    )
    .toBe("1");
  expect(
    await button.evaluate((element) => getComputedStyle(element).outlineStyle),
  ).toBe("solid");
});

test("pending auth stays open, traps focus and reports failure without a database", async ({
  page,
}) => {
  let release: (() => void) | undefined;
  const responseReady = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route("**/api/auth/providers", (route) =>
    route.fulfill({
      json: {
        credentials: {
          id: "credentials",
          name: "Credentials",
          type: "credentials",
          signinUrl: "http://localhost:3100/api/auth/signin/credentials",
          callbackUrl: "http://localhost:3100/api/auth/callback/credentials",
        },
      },
    }),
  );
  await page.route("**/api/auth/csrf", (route) =>
    route.fulfill({ json: { csrfToken: "ui-test-only" } }),
  );
  await page.route("**/api/auth/callback/credentials", async (route) => {
    await responseReady;
    await route.fulfill({
      status: 401,
      json: {
        url: "http://localhost:3100/auth/sign-in?error=CredentialsSignin",
      },
    });
  });
  await page.goto("/auth/sign-in");
  await page
    .getByLabel("Email address", { exact: true })
    .fill("ui@example.test");
  await page
    .getByLabel("Password", { exact: true })
    .fill("not a real password");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Please wait…" }),
  ).toBeDisabled();
  expect(
    await page
      .locator(".auth-submit")
      .evaluate((element) => getComputedStyle(element, "::after").opacity),
  ).toBe("0");
  await expect(
    page.getByRole("button", { name: "Close authentication" }),
  ).toBeDisabled();
  await page.keyboard.press("Escape");
  await expect(
    page
      .getByRole("navigation", { name: "Account access" })
      .getByRole("link", { name: "Create account" }),
  ).toHaveAttribute("aria-disabled", "true");
  await expect(page).toHaveURL("/en/auth/sign-in");
  await expect(page.getByRole("dialog")).toBeVisible();
  release?.();
  await expect(page.getByRole("dialog").getByRole("alert")).toContainText(
    "Unable to sign in",
  );
  const close = page.getByRole("button", { name: "Close authentication" });
  await close.focus();
  await page.keyboard.press("Shift+Tab");
  expect(
    await page.evaluate(() => !!document.activeElement?.closest("dialog")),
  ).toBe(true);
  await page.keyboard.press("Tab");
  await expect(close).toBeFocused();
  await page.getByRole("dialog").click({ position: { x: 2, y: 2 } });
  await expect(page).toHaveURL("/en");
});

test("low mobile viewport keeps close visible and respects reduced motion", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 520 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/auth/sign-up");
  await expect(
    page.getByRole("button", { name: "Close authentication" }),
  ).toBeInViewport();
  await page.getByLabel("Confirm password").fill("a test phrase");
  await expect(
    page.getByRole("button", { name: "Close authentication" }),
  ).toBeInViewport();
  const submit = page.getByRole("button", {
    name: "Create account",
    exact: true,
  });
  await submit.focus();
  expect(
    await submit.evaluate(
      (element) => getComputedStyle(element, "::after").animationName,
    ),
  ).toBe("none");
  await page.keyboard.press("Escape");
  await expect(page).toHaveURL("/en");
});

for (const width of [320, 390, 768, 1024, 1448]) {
  test(`auth forms at ${width}px in both themes`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width, height: 1000 });
    await page.emulateMedia({ colorScheme: "light", reducedMotion: "reduce" });
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    for (const mode of ["sign-in", "sign-up"]) {
      for (const theme of ["light", "dark"]) {
        await page.emulateMedia({
          colorScheme: theme === "dark" ? "dark" : "light",
        });
        await page.goto(`/auth/${mode}`);
        await expect(page.getByRole("dialog")).toBeVisible();
        await expect(page.locator(".auth-modal")).toHaveCSS("opacity", "1");
        await expect(page.locator("html")).toHaveClass(new RegExp(theme));
        await expect(page.getByRole("dialog").locator("h1")).toBeVisible();
        if (width >= 1024) {
          await expect
            .poll(() =>
              page
                .locator(".auth-modal-photo img")
                .evaluate(
                  (image) =>
                    image instanceof HTMLImageElement &&
                    image.complete &&
                    image.naturalWidth > 0,
                ),
            )
            .toBe(true);
        }
        expect(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
        ).toBe(true);
        await page.screenshot({
          path: testInfo.outputPath(`${mode}-${width}-${theme}.png`),
          fullPage: false,
        });
      }
    }
    await page
      .getByRole("button", { name: "Create account", exact: true })
      .click();
    await expect(
      page.getByLabel("Display name", { exact: true }),
    ).toHaveAttribute("aria-invalid", "true");
    expect(errors).toEqual([]);
  });
}
test("desktop header yields to a stable expandable dock", async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 1448, height: 800 });
  await page.goto("/");
  const headerNav = page.getByRole("navigation", {
    name: "Main navigation",
    exact: true,
  });
  await expect(
    headerNav.getByRole("link", { name: "Home", exact: true }),
  ).toHaveAttribute("aria-current", "page");
  await expect(
    headerNav.getByRole("link", { name: "New recipe", exact: true }),
  ).toHaveAttribute("href", "/en/recipes/new");

  await page.evaluate(() => window.scrollTo(0, 170));
  await expect(page.locator("html")).toHaveAttribute(
    "data-navigation-docked",
    "true",
  );
  const dock = page
    .getByRole("complementary", { name: "Cookly shortcuts" })
    .getByRole("navigation", { name: "Main navigation" });
  await expect(
    dock.getByRole("link", { name: "Home", exact: true }),
  ).toHaveAttribute("aria-current", "page");
  await page.evaluate(() => window.scrollTo(0, 100));
  await expect(page.locator("html")).toHaveAttribute(
    "data-navigation-docked",
    "true",
  );
  await page
    .locator(".desktop-dock-surface")
    .hover({ position: { x: 28, y: 28 } });
  await expect(
    dock.getByRole("link", { name: "New recipe", exact: true }),
  ).toBeVisible();
  await page.screenshot({
    path: testInfo.outputPath("desktop-dock-expanded.png"),
    fullPage: false,
  });
  await page.evaluate(() => window.scrollTo(0, 70));
  await expect(page.locator("html")).not.toHaveAttribute(
    "data-navigation-docked",
    "true",
  );
  await page.evaluate(() => window.scrollTo(0, 0));
  await expect(page.locator(".site-header")).toBeInViewport();
});

test("modal keeps the background, replaces tabs, restores focus and supports history", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/recipes?q=soup");
  await expect(page.locator("#catalog-results")).toBeInViewport();
  const trigger = page.locator(".site-header .sign-in-button");
  await trigger.focus();
  const before = await page.evaluate(() => scrollY);
  await trigger.press("Enter");
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.locator("#catalog-results")).toHaveText("Your results");
  await page
    .getByRole("navigation", { name: "Account access" })
    .getByRole("link", { name: "Create account" })
    .click();
  await expect(page).toHaveURL(/auth\/sign-up/);
  await expect(page.locator("dialog[open]")).toHaveCount(1);
  await page
    .getByLabel("Password", { exact: true })
    .fill("discard this password");
  await page.keyboard.press("Escape");
  await expect(page).toHaveURL("/en/recipes?q=soup");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(trigger).toBeFocused();
  expect(Math.abs((await page.evaluate(() => scrollY)) - before)).toBeLessThan(
    3,
  );
  await page.goForward();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.getByLabel("Password", { exact: true })).toHaveValue("");
  await page.goBack();
  await expect(page.getByRole("dialog")).toHaveCount(0);
});

test("direct auth links and refresh use Home, with an explicit close fallback", async ({
  page,
}) => {
  for (const mode of ["sign-in", "sign-up"]) {
    await page.goto(`/auth/${mode}`);
    await page.reload();
    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(page.locator("#home-title")).toHaveText(
      "Cook better, together.",
    );
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
      "content",
      /noindex/,
    );
    await page
      .getByRole("navigation", { name: "Account access" })
      .getByRole("link", {
        name: mode === "sign-in" ? "Create account" : "Sign in",
        exact: true,
      })
      .click();
    await expect(page.locator("dialog[open]")).toHaveCount(1);
    await page.getByRole("button", { name: "Close authentication" }).click();
    await expect(page).toHaveURL("/en");
    await expect(page.getByRole("dialog")).toHaveCount(0);
  }
});
