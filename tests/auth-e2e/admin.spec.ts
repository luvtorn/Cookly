import { test, expect } from "@playwright/test";
import { randomUUID } from "node:crypto";
import pg from "pg";
import { createAdmin } from "../../scripts/create-admin.mjs";
import { seedEditorial } from "../../scripts/seed-editorial.mjs";
import recipes from "../../prisma/starter-recipes.json" with { type: "json" };

test("editorial studio: authorization, catalog, editing, archiving and responsive layouts", async ({
  page,
}, testInfo) => {
  test.setTimeout(240000);
  const client = new pg.Client({
    connectionString: process.env.TEST_DATABASE_URL,
  });
  await client.connect();
  const suffix = randomUUID().slice(0, 8),
    email = `studio-${suffix}@example.test`;
  let adminId = "";
  try {
    const credentials = await createAdmin(client, email, `studio_${suffix}`);
    adminId = (
      await client.query('SELECT id FROM "User" WHERE email=$1', [email])
    ).rows[0].id;
    await seedEditorial(
      client,
      email,
      Object.fromEntries(
        recipes.map((r) => [
          r.slug,
          {
            url: `https://res.cloudinary.com/test/image/upload/${r.slug}`,
            key: `test/${r.slug}`,
          },
        ]),
      ),
    );
    // Isolated fixtures use local covers; CI never uploads assets or needs Cloudinary credentials.
    for (const recipe of recipes)
      await client.query(
        'UPDATE "Recipe" SET "coverImageUrl"=$1 WHERE slug=$2 AND "authorId"=$3',
        [`/images/editorial/${recipe.slug}.png`, recipe.slug, adminId],
      );
    await page.goto("/admin");
    await expect(page).toHaveURL(/auth\/sign-in/);
    await page.getByLabel("Email address", { exact: true }).fill(email);
    await page
      .getByLabel("Password", { exact: true })
      .fill(credentials.password);
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await expect(page).toHaveURL(/\/admin$/, { timeout: 15000 });
    await expect(
      page.getByRole("heading", { name: "Welcome back." }),
    ).toBeVisible();
    for (const theme of ["light", "dark"])
      for (const width of [390, 768, 1448]) {
        await page.setViewportSize({ width, height: 1000 });
        await page.evaluate((theme) => {
          document.documentElement.classList.toggle("dark", theme === "dark");
        }, theme);
        expect(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
        ).toBe(true);
        expect(
          await page.locator(".admin-sidebar").evaluate((shell) => {
            const box = shell.getBoundingClientRect();
            return Array.from(shell.querySelectorAll("nav a")).every((link) => {
              const rect = link.getBoundingClientRect();
              return rect.left >= box.left && rect.right <= box.right;
            });
          }),
        ).toBe(true);
        await page.screenshot({
          path: testInfo.outputPath(`studio-${theme}-${width}.png`),
          fullPage: true,
        });
      }
    await page.setViewportSize({ width: 1448, height: 1000 });
    await page
      .getByRole("link", { name: "Create a recipe", exact: false })
      .click();
    await page.getByRole("button", { name: "Save recipe" }).click();
    await expect(page.locator(".editor-result")).toContainText(
      "highlighted fields",
    );
    await page.getByLabel("Upload cover").setInputFiles({
      name: "not-an-image.svg",
      mimeType: "image/svg+xml",
      buffer: Buffer.from("<svg>not allowed</svg>"),
    });
    await expect(page.locator(".editor-result")).toContainText("Upload failed");
    await page.goto("/admin/recipes/cookly-editorial-chicken-teriyaki/edit");
    await expect(page.getByLabel("Title", { exact: true })).toHaveValue(
      "Chicken Teriyaki",
    );
    await page
      .getByLabel("Title", { exact: true })
      .fill("Chicken Teriyaki — an editorial test");
    await page.getByRole("button", { name: "Save recipe" }).click();
    await expect(page.locator(".editor-result")).toContainText("Recipe saved");
    await page.reload();
    await expect(page.getByLabel("Title", { exact: true })).toHaveValue(
      "Chicken Teriyaki — an editorial test",
    );
    for (const width of [390, 768, 1448]) {
      await page.setViewportSize({ width, height: 900 });
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      await page.screenshot({
        path: testInfo.outputPath(`editor-${width}.png`),
        fullPage: true,
      });
    }
    await page.goto("/?q=teriyaki#recipes");
    await expect(page.locator(".recipe-card")).toHaveCount(1);
    await expect(page.locator(".recipe-card .author")).toHaveText("Cookly");
    await page.locator(".recipe-card").click({ position: { x: 24, y: 24 } });
    await expect(page).toHaveURL(/\/recipes\/chicken-teriyaki\?from=/);
    await expect(
      page.getByRole("heading", { name: "Ingredients", exact: true }),
    ).toBeVisible();
    await expect(page.locator("figcaption")).toContainText(
      "Cover illustration generated with AI.",
    );
    await expect(page.locator("main")).not.toContainText(email);
    await page.getByRole("link", { name: "All recipes" }).click();
    await expect(page).toHaveURL(/\/recipes\?q=teriyaki/);
    await page.goto("/admin/verification");
    const review = page
      .locator(".verification-item")
      .filter({ hasText: "Chicken Teriyaki" });
    await expect(review).toHaveCount(0);
    await expect(
      page.getByRole("navigation", { name: "Verification queues" }),
    ).toBeVisible();
    for (const theme of ["light", "dark"] as const) {
      await page.emulateMedia({ colorScheme: theme, reducedMotion: "reduce" });
      for (const width of [390, 768, 1448]) {
        await page.setViewportSize({ width, height: 1000 });
        for (const route of [
          "/",
          "/recipes",
          "/recipes/chicken-teriyaki",
          "/admin/verification",
        ]) {
          await page.goto(route);
          await page.evaluate(() => document.fonts.ready);
          if (route === "/")
            await expect(
              page.getByRole("heading", { name: "From Cookly" }),
            ).toBeVisible();
          if (route === "/recipes")
            await expect(
              page.getByRole("heading", { name: "All recipes" }),
            ).toBeVisible();
          if (route === "/recipes/chicken-teriyaki")
            await expect(
              page.getByRole("heading", { name: /Chicken Teriyaki/ }),
            ).toBeVisible();
          if (route === "/admin/verification")
            await expect(
              page.getByRole("heading", { name: "Recipe verification" }),
            ).toBeVisible();
          expect(
            await page.evaluate(
              () => document.documentElement.scrollWidth <= innerWidth,
            ),
          ).toBe(true);
          if (route === "/")
            await expect(page.locator(".recipe-card")).toHaveCount(6);
          if (route === "/recipes")
            await expect(page.locator(".recipe-card")).toHaveCount(10);
          if (route === "/recipes/chicken-teriyaki") {
            await expect(page.locator(".verified-badge")).toHaveText(
              "Cookly verified",
            );
            await expect(page.locator("main")).not.toContainText(
              "Private E2E review",
            );
            await expect(page.locator(".recipe-community")).toBeVisible();
            await expect(
              page.getByRole("button", { name: "Like recipe", exact: true }),
            ).toBeVisible();
            await expect(
              page.getByRole("button", { name: "Post comment" }),
            ).toBeDisabled();
            await expect(
              page.getByLabel("Your comment", { exact: true }),
            ).toBeEnabled();
            const cover = await page.locator(".recipe-cover").boundingBox();
            const main = await page.locator("main").boundingBox();
            expect(
              Math.abs(
                (cover?.x ?? 0) +
                  (cover?.width ?? 0) / 2 -
                  ((main?.x ?? 0) + (main?.width ?? 0) / 2),
              ),
            ).toBeLessThanOrEqual(1);
            await page
              .getByRole("link", { name: "Method ↓", exact: true })
              .click();
            const header = await page.locator(".site-header").boundingBox();
            expect(
              (await page.locator("#method h2").boundingBox())?.y,
            ).toBeGreaterThanOrEqual((header?.y ?? 0) + (header?.height ?? 0));
            await page.evaluate(() => scrollTo(0, 0));
          }
          await page.screenshot({
            path: testInfo.outputPath(
              `discovery-${route.replaceAll("/", "_")}-${theme}-${width}.png`,
            ),
            fullPage: true,
          });
        }
      }
    }
    await page.setViewportSize({ width: 1448, height: 1000 });
    await page.goto("/admin/recipes/cookly-editorial-chicken-teriyaki/edit");
    await page.getByRole("combobox", { name: "Publication status" }).click();
    await page.getByRole("option", { name: "Archived" }).click();
    page.once("dialog", (dialog) => dialog.accept());
    await page.getByRole("button", { name: "Save recipe" }).click();
    await expect(page.locator(".editor-result")).toContainText("Recipe saved");
    await expect
      .poll(
        async () =>
          (
            await client.query(
              'SELECT status FROM "Recipe" WHERE slug=$1 AND "authorId"=$2',
              ["chicken-teriyaki", adminId],
            )
          ).rows[0]?.status,
      )
      .toBe("ARCHIVED");
    await page.goto("/recipes/chicken-teriyaki");
    // Next.js streaming may send HTTP 200 before notFound resolves. Verify
    // no recipe data and noindex instead of relying on transport status alone.
    await expect(
      page.getByRole("heading", { name: "Ingredients", exact: true }),
    ).toHaveCount(0);
    await expect(
      page.locator('meta[name="robots"][content*="noindex"]').first(),
    ).toHaveAttribute("content", /noindex/);
    await client.query("UPDATE \"User\" SET role='USER' WHERE id=$1", [
      adminId,
    ]);
    await page.goto("/admin");
    await expect(page).toHaveURL(new RegExp(`/en/u/studio_${suffix}$`));
    await page.goto("/admin/verification");
    await expect(page).toHaveURL(new RegExp(`/en/u/studio_${suffix}$`));
    await page.goto("/recipes");
    await expect(page.locator(".recipe-card")).toHaveCount(9);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.getByRole("link", { name: "Home", exact: true }).first().click();
    expect(
      (await page.locator(".site-header").boundingBox())?.y,
    ).toBeGreaterThanOrEqual(0);
  } finally {
    await page.goto("about:blank").catch(() => undefined);
    if (adminId)
      await client.query('DELETE FROM "ModerationAction" WHERE "actorId"=$1', [
        adminId,
      ]);
    if (adminId)
      await client.query('DELETE FROM "User" WHERE id=$1 AND email=$2', [
        adminId,
        email,
      ]);
    await client.end();
  }
});
