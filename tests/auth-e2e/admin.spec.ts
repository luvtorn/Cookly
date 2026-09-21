import { test, expect } from "@playwright/test";
import { randomUUID } from "node:crypto";
import pg from "pg";
import { createAdmin } from "../../scripts/create-admin.mjs";
import { seedEditorial } from "../../scripts/seed-editorial.mjs";
import recipes from "../../prisma/starter-recipes.json" with { type: "json" };

test("editorial studio: authorization, catalog, editing, archiving and responsive layouts", async ({
  page,
}, testInfo) => {
  test.setTimeout(120000);
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
    await expect(page).toHaveURL(/\/admin$/);
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
    await expect(page.getByRole("status")).toContainText("highlighted fields");
    await page.getByLabel("Upload cover").setInputFiles({
      name: "not-an-image.svg",
      mimeType: "image/svg+xml",
      buffer: Buffer.from("<svg>not allowed</svg>"),
    });
    await expect(page.getByRole("status")).toContainText("Upload failed");
    await page.goto("/admin/recipes/cookly-editorial-chicken-teriyaki/edit");
    await expect(page.getByLabel("Recipe title")).toHaveValue(
      "Chicken Teriyaki",
    );
    await page
      .getByLabel("Recipe title")
      .fill("Chicken Teriyaki — an editorial test");
    await page.getByRole("button", { name: "Save recipe" }).click();
    await expect(page.getByRole("status")).toContainText("Recipe saved");
    await page.reload();
    await expect(page.getByLabel("Recipe title")).toHaveValue(
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
    await page.locator(".recipe-card").getByRole("link").click();
    await expect(page).toHaveURL(/\/recipes\/chicken-teriyaki$/);
    await expect(
      page.getByRole("heading", { name: "Ingredients", exact: true }),
    ).toBeVisible();
    await expect(page.locator("figcaption")).toContainText(
      "AI-generated illustration",
    );
    await expect(page.locator("main")).not.toContainText(email);
    await page.goto("/admin/recipes/cookly-editorial-chicken-teriyaki/edit");
    await page.getByLabel("Publication status").selectOption("ARCHIVED");
    page.once("dialog", (dialog) => dialog.accept());
    await page.getByRole("button", { name: "Save recipe" }).click();
    await expect(page.getByRole("status")).toContainText("Recipe saved");
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
    await expect(page).toHaveURL(/settings\/account\?access=denied/);
    await page.goto("/");
    await expect(page.locator(".recipe-card")).toHaveCount(9);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page
      .getByRole("link", { name: "Categories", exact: true })
      .first()
      .click();
    expect(
      (await page.locator(".site-header").boundingBox())?.y,
    ).toBeGreaterThanOrEqual(0);
  } finally {
    if (adminId)
      await client.query('DELETE FROM "User" WHERE id=$1 AND email=$2', [
        adminId,
        email,
      ]);
    await client.end();
  }
});
