import { expect, test } from "@playwright/test";

test("long account-name layout fixture stays inside the header", async ({
  page,
}) => {
  for (const width of [1100, 1448]) {
    await page.setViewportSize({ width, height: 900 });
    for (const theme of ["light", "dark"] as const) {
      await page.emulateMedia({ colorScheme: theme });
      await page.goto("/ru");
      // Layout-only fixture: does not authenticate or write a database user.
      await page.locator(".header-account-access").evaluate((host) => {
        host.innerHTML =
          '<details class="account-menu account-menu--header"><summary><span class="account-initials">MI</span><span class="account-name">Mikołaj Germanenka VeryLongAccountName</span></summary></details>';
      });
      const geometry = await page.locator(".site-header").evaluate((header) => {
        const name = header.querySelector(".account-name");
        const avatar = header.querySelector(".account-initials");
        if (!name || !avatar) throw new Error("Missing account layout fixture");
        return {
          right: name.getBoundingClientRect().right,
          edge: header.getBoundingClientRect().right,
          avatar: avatar.getBoundingClientRect().width,
          overflow: getComputedStyle(name).textOverflow,
        };
      });
      expect(geometry.right).toBeLessThan(geometry.edge - 10);
      expect(geometry.avatar).toBe(32);
      expect(geometry.overflow).toBe("ellipsis");
      await page.screenshot({
        path: `test-results/header-${width}-${theme}.png`,
      });
    }
  }
});

test("successful sign-in response shows a toast after client navigation", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  // Mock the auth transport only; this test verifies feedback, not database auth.
  await page.route("**/api/auth/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    const json = path.endsWith("/providers")
      ? {
          credentials: {
            id: "credentials",
            name: "Credentials",
            type: "credentials",
          },
        }
      : path.endsWith("/csrf")
        ? { csrfToken: "test-only" }
        : path.includes("/callback/")
          ? { url: "http://localhost:3100/en/recipes" }
          : {};
    await route.fulfill({ json });
  });
  await page.goto("/en/auth/sign-in?callbackUrl=%2Fen%2Frecipes");
  await page
    .getByLabel("Email address", { exact: true })
    .fill("cook@example.test");
  await page.getByLabel("Password", { exact: true }).fill("test-only-password");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(/\/en\/recipes$/);
  await expect(page.locator(".toast-message")).toContainText(
    "You're signed in",
  );
  const toast = await page.locator(".toast-message").boundingBox();
  const nav = await page.locator(".mobile-bottom-navigation").boundingBox();
  expect(toast).not.toBeNull();
  expect(nav).not.toBeNull();
  expect((toast?.y ?? 0) + (toast?.height ?? 0)).toBeLessThan(nav?.y ?? 0);
  await page.screenshot({ path: "test-results/login-toast-mobile.png" });
});
