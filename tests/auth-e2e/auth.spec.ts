import { expect, test } from "@playwright/test";
import { randomUUID } from "node:crypto";

test("registration → login → refreshed account → logout, credentials and CSRF", async ({
  page,
  request,
}, testInfo) => {
  const suffix = randomUUID().replaceAll("-", "").slice(0, 12);
  const email = `e2e-${suffix}@example.test`;
  const password = "a long e2e cooking passphrase";
  await page.goto("/settings/account");
  await expect(page).toHaveURL(/auth\/sign-in\?callbackUrl/);
  await page
    .getByRole("navigation", { name: "Account access" })
    .getByRole("link", { name: "Create account" })
    .click();
  await page
    .getByLabel("Display name", { exact: true })
    .fill(
      "A Cook with a deliberately long display name for account navigation",
    );
  await page.getByLabel("Username", { exact: true }).fill(`e2e_${suffix}`);
  await page.getByLabel("Email address", { exact: true }).fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByLabel("Confirm password", { exact: true }).fill(password);
  await page
    .getByRole("button", { name: "Create account", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText("Your account is ready");
  await expect(page.locator("dialog[open]")).toHaveCount(1);
  await page.getByLabel("Email address", { exact: true }).fill(email);
  await page.getByLabel("Password", { exact: true }).fill("wrong password");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page.locator("form").getByRole("alert")).toContainText(
    "Unable to sign in",
  );
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(/settings\/account$/);
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.locator("main")).toContainText(email);
  await page.reload();
  await expect(page.locator("main")).toContainText(email);
  await page.locator(".account-menu summary").focus();
  await page.keyboard.press("Enter");
  await expect(
    page.getByRole("link", { name: "Your account", exact: true }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.locator(".account-menu summary")).toBeFocused();
  for (const width of [390, 768, 1448]) {
    await page.setViewportSize({ width, height: 1000 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: testInfo.outputPath(`account-long-name-${width}.png`),
      fullPage: true,
    });
  }
  const cookies = await page.context().cookies();
  expect(
    cookies.find((cookie) => cookie.name === "next-auth.session-token"),
  ).toMatchObject({ httpOnly: true, sameSite: "Lax" });
  const csrf = await request.post("/api/auth/callback/credentials", {
    form: { email, password, json: "true" },
  });
  expect(await csrf.text()).toContain("csrf=true");
  expect(csrf.headers()["set-cookie"] ?? "").not.toContain("session-token");
  expect(await (await request.get("/api/auth/session")).json()).toEqual({});
  await page.locator("main").getByRole("button", { name: "Sign out" }).click();
  await expect(page).toHaveURL("/");
  await page.goto("/settings/account");
  await expect(page).toHaveURL(/auth\/sign-in/);
});
