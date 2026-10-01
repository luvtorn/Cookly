import { expect, test } from "@playwright/test";
import { randomUUID } from "node:crypto";

test("registration → login → refreshed account → logout, credentials and CSRF", async ({
  page,
  request,
}, testInfo) => {
  test.setTimeout(180000);
  const suffix = randomUUID().replaceAll("-", "").slice(0, 12);
  const email = `e2e-${suffix}@example.test`;
  const username = `e2e_${suffix}`;
  const password = "a long e2e cooking passphrase";
  await page.goto("/recipes/new");
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
  await page.getByLabel("Username", { exact: true }).fill(username);
  await page.getByLabel("Email address", { exact: true }).fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByLabel("Confirm password", { exact: true }).fill(password);
  await page
    .getByRole("button", { name: "Create account", exact: true })
    .click();
  await expect(page.locator(".auth-success")).toContainText(
    "Your account is ready",
  );
  await expect(page.locator("dialog[open]")).toHaveCount(1);
  await page.getByLabel("Email address", { exact: true }).fill(email);
  await page.getByLabel("Password", { exact: true }).fill("wrong password");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page.locator("form").getByRole("alert")).toContainText(
    "Unable to sign in",
  );
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(/recipes\/new$/);
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(
    page.getByRole("heading", { name: "A new recipe" }),
  ).toBeVisible();
  for (const width of [390, 768]) {
    await page.setViewportSize({ width, height: 900 });
    await expect(page.locator(".mobile-bottom-navigation")).toBeHidden();
  }
  await page.setViewportSize({ width: 1448, height: 1000 });
  await page.goto("/settings/account");
  await expect(page).toHaveURL(new RegExp(`/en/u/${username}$`));
  await page.getByText("Account details", { exact: true }).click();
  await expect(page.locator("main")).toContainText(email);
  await page.reload();
  await page.getByText("Account details", { exact: true }).click();
  await expect(page.locator("main")).toContainText(email);
  const headerAccount = page.locator(".site-header .account-menu summary");
  await headerAccount.focus();
  await page.keyboard.press("Enter");
  await expect(
    page.getByRole("link", { name: "My profile", exact: true }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(headerAccount).toBeFocused();
  await page.goto("/settings/profile");
  await expect(page).toHaveURL(new RegExp(`/en/u/${username}$`));
  await page.getByRole("button", { name: "Edit profile" }).click();
  await page
    .getByLabel("Display name", { exact: true })
    .fill("E2E Community Cook");
  await page
    .getByLabel("Bio", { exact: true })
    .fill("Seasonal recipes from an isolated test.");
  await page.getByLabel("Location", { exact: true }).fill("Test Kitchen");
  await page.getByRole("button", { name: "Save profile" }).click();
  await expect(page.locator(".profile-form").getByRole("status")).toContainText(
    "Profile updated",
  );
  await page.goto(`/u/${username}`);
  await expect(
    page.getByRole("heading", { name: "E2E Community Cook", exact: true }),
  ).toBeVisible();
  await expect(page.locator("main")).toContainText(
    "Seasonal recipes from an isolated test.",
  );
  const renamedUsername = `${username}_new`;
  await page.getByRole("button", { name: "Edit profile" }).click();
  expect(
    await page
      .getByRole("button", { name: "Save profile" })
      .evaluate((element) => getComputedStyle(element).backgroundColor),
  ).toBe("rgb(62, 101, 57)");
  for (const width of [390, 768, 1448]) {
    await page.setViewportSize({ width, height: 1000 });
    const hero = await page.locator(".creator-profile-hero").boundingBox();
    const form = await page.locator(".profile-edit-panel").boundingBox();
    expect(hero).not.toBeNull();
    expect(form).not.toBeNull();
    if (hero && form)
      expect(form.y).toBeGreaterThanOrEqual(hero.y + hero.height);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: testInfo.outputPath(`profile-edit-${width}.png`),
      fullPage: true,
    });
  }
  await page.locator(".site-header .theme-toggle").click();
  await expect(page.locator("html")).toHaveClass(/dark/);
  for (const width of [390, 768, 1448]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.screenshot({
      path: testInfo.outputPath(`profile-edit-dark-${width}.png`),
      fullPage: true,
    });
  }
  await page.locator(".site-header .theme-toggle").click();
  await page.getByLabel("Username", { exact: true }).fill(renamedUsername);
  await page.getByRole("button", { name: "Save profile" }).click();
  await expect(page).toHaveURL(new RegExp(`/en/u/${renamedUsername}$`));
  await page.goto("/my-recipes");
  await expect(page.getByRole("heading", { name: "My recipes" })).toBeVisible();
  await expect(page.getByText("Your first recipe starts here.")).toBeVisible();
  await page.setViewportSize({ width: 390, height: 900 });
  const statusField = await page
    .locator(".creator-filters .glass-select-field")
    .boundingBox();
  expect(statusField?.height).toBeLessThan(110);
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
  await page.setViewportSize({ width: 390, height: 844 });
  const mobileProfile = page.getByRole("button", {
    name: "Open profile menu",
  });
  await mobileProfile.click();
  await expect(
    page.getByRole("dialog", { name: "E2E Community Cook" }),
  ).toBeVisible();
  await expect(
    page
      .getByRole("dialog", { name: "E2E Community Cook" })
      .getByRole("link", { name: "My profile" }),
  ).toHaveAttribute("href", `/en/u/${renamedUsername}`);
  await page.keyboard.press("Escape");
  await expect(mobileProfile).toBeFocused();
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
  await page.goto("/settings/account");
  await page.getByText("Account details", { exact: true }).click();
  await page.locator("main").getByRole("button", { name: "Sign out" }).click();
  await expect(page).toHaveURL(/\/en\/?$/);
  await page.goto(`/u/${renamedUsername}`);
  await expect(page.locator("main.creator-profile")).toBeVisible();
  await expect(page.locator("main.creator-profile")).not.toContainText(email);
  expect(await page.content()).not.toContain(email);
  await expect(page.getByRole("button", { name: "Edit profile" })).toHaveCount(
    0,
  );
  await page.goto("/recipes/new");
  await expect(page).toHaveURL(/auth\/sign-in/);
});
