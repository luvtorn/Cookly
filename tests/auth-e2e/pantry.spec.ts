import { expect, test } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { PrismaClient } from "../../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { hashPassword } from "../../src/lib/auth/password";
const url = process.env.TEST_DATABASE_URL;
if (
  !url ||
  !["localhost", "127.0.0.1", "[::1]"].includes(new URL(url).hostname) ||
  new URL(url).pathname !== "/cookly_test"
)
  throw new Error("Pantry E2E requires isolated cookly_test");
const db = new PrismaClient({
  adapter: new PrismaPg({ connectionString: url }),
});
const run = randomUUID().slice(0, 8);
const email = `pantry-e2e-${run}@example.test`,
  password = `local-${randomUUID()}`;
const ingredientName = `Pantry tomato ${run}`,
  ingredientId = `pantry-e2e-${run}`;
let owner = "",
  category = "";
test.beforeAll(async () => {
  owner = (
    await db.user.create({
      data: {
        email,
        passwordHash: await hashPassword(password),
        status: "ACTIVE",
        profile: {
          create: {
            username: `pantry_${run}`,
            displayName: "Pantry Test Cook",
          },
        },
      },
    })
  ).id;
  category = (
    await db.category.create({
      data: { name: `Pantry ${run}`, slug: `pantry-${run}` },
    })
  ).id;
  await db.ingredient.create({
    data: {
      id: ingredientId,
      name: ingredientName,
      normalizedName: ingredientName.toLowerCase(),
      slug: ingredientId,
    },
  });
  for (let i = 0; i < 13; i++)
    await db.recipe.create({
      data: {
        authorId: owner,
        categoryId: category,
        slug: `pantry-e2e-${run}-${i}`,
        title: `Tomato soup ${i} — a comforting bowl for a long evening`,
        description:
          "A warm bowl of roasted tomato soup. A test recipe for pantry matching.",
        coverImageUrl: "/images/tomato-soup.webp",
        servings: 2,
        prepMinutes: 5,
        cookMinutes: 10,
        difficulty: "EASY",
        status: "PUBLISHED",
        publishedAt: new Date(),
        ingredients: { create: { ingredientId, position: 0 } },
        steps: { create: { position: 0, instruction: "Simmer and serve." } },
      },
    });
});
test.afterAll(async () => {
  if (owner) await db.user.delete({ where: { id: owner } });
  if (category) await db.category.delete({ where: { id: category } });
  await db.ingredient.deleteMany({ where: { id: ingredientId } });
  await db.$disconnect();
});
test("guest → sign-in → ingredients → matches → recipe return, filters and responsive layouts", async ({
  page,
}, testInfo) => {
  test.setTimeout(240000);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/en/pantry");
  await expect(
    page.getByText("Sign in to save your ingredients and find recipes."),
  ).toBeVisible();
  await page
    .locator("main")
    .getByRole("link", { name: "Sign in", exact: true })
    .click();
  await expect(page.locator("dialog[open]")).toBeVisible();
  await page.getByLabel("Email address", { exact: true }).fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(/\/en\/pantry$/);
  const input = page.locator(".pantry-manager").getByRole("combobox");
  await input.fill(ingredientName);
  await expect(
    page.getByRole("option", { name: new RegExp(ingredientName) }),
  ).toBeVisible();
  await input.press("ArrowDown");
  await input.press("Enter");
  await expect(page.locator(".pantry-chips li")).toHaveCount(1);
  await expect(page.locator(".pantry-match")).toHaveCount(12);
  await expect(page.getByText("Have 1 of 1", { exact: true })).toHaveCount(12);
  await page.reload();
  await expect(page.locator(".pantry-chips li")).toHaveCount(1);
  await page.getByRole("link", { name: "Next", exact: true }).click();
  await expect(page.locator(".pantry-match")).toHaveCount(1);
  await page.locator(".recipe-title-button").click();
  await expect(page.locator(".recipe-detail")).toBeVisible();
  await page.locator(".recipe-detail > .text-link").click();
  await expect(page).toHaveURL(/\/pantry\?page=2$/);
  await page.getByLabel("Maximum total time").fill("1");
  await page.getByRole("button", { name: "Find recipes", exact: true }).click();
  await expect(page).not.toHaveURL(/page=2/);
  await expect(page.getByText(/No matches with these filters/)).toBeVisible();
  await page.getByRole("link", { name: "Clear filters", exact: true }).click();
  await expect(page.locator(".pantry-match")).toHaveCount(12);
  await page.goBack();
  await expect(page.getByText(/No matches with these filters/)).toBeVisible();
  await page.goForward();
  await expect(page.locator(".pantry-match")).toHaveCount(12);
  for (const locale of ["en", "ru", "pl"]) {
    await page.goto(`/${locale}/pantry`);
    for (const width of [390, 768, 1100, 1448]) {
      await page.setViewportSize({ width, height: 900 });
      for (const theme of ["light", "dark"]) {
        await page.evaluate((value) => {
          document.documentElement.classList.toggle("dark", value === "dark");
        }, theme);
        await expect(page.locator(".pantry-match")).toHaveCount(12);
        expect(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= window.innerWidth,
          ),
        ).toBe(true);
        await page.locator(".pantry-manager").scrollIntoViewIfNeeded();
        await page.screenshot({
          path: testInfo.outputPath(`pantry-${locale}-${width}-${theme}.png`),
        });
      }
    }
  }
  await page.goto("/en/my-recipes");
  const statusNav = page.getByRole("navigation", {
    name: "Status",
    exact: true,
  });
  await expect(
    statusNav.getByRole("link", { name: "All recipes", exact: true }),
  ).toHaveAttribute("aria-current", "page");
  await expect(page.locator(".creator-recipe-card")).toHaveCount(12);
  for (const width of [390, 768, 1100, 1448]) {
    await page.setViewportSize({ width, height: 900 });
    for (const theme of ["light", "dark"]) {
      await page.evaluate(
        (value) =>
          document.documentElement.classList.toggle("dark", value === "dark"),
        theme,
      );
      // Wait for the tab color transition before recording the themed surface.
      await expect(statusNav.getByRole("link").nth(1)).toHaveCSS(
        "color",
        theme === "dark" ? "rgb(192, 200, 187)" : "rgb(96, 102, 95)",
      );
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      await page.screenshot({
        path: testInfo.outputPath(`my-recipes-${width}-${theme}.png`),
      });
    }
  }
  await statusNav.getByRole("link", { name: "Draft", exact: true }).click();
  await expect(page).toHaveURL(/status=DRAFT$/);
  await expect(page.locator(".creator-recipe-card")).toHaveCount(0);
  await page.goBack();
  await expect(page.locator(".creator-recipe-card")).toHaveCount(12);
  await page.locator(".owner-verification summary").first().click();
  await expect(
    page.locator(".owner-verification textarea").first(),
  ).toBeVisible();
  await page.goto("/en/pantry");
  await page.setViewportSize({ width: 390, height: 600 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await input.fill(ingredientName);
  const option = page.getByRole("option", { name: new RegExp(ingredientName) });
  await expect(option).toBeVisible();
  await page.screenshot({
    path: testInfo.outputPath("short-screen-suggestions.png"),
  });
  await testInfo.attach("suggestion-geometry", {
    contentType: "application/json",
    body: JSON.stringify(
      await option.evaluate((element) => {
        const r = element.getBoundingClientRect();
        const panel = element.closest(".ingredient-suggestions");
        return {
          rect: r.toJSON(),
          side: panel?.getAttribute("data-side"),
          panel: panel?.getBoundingClientRect().toJSON(),
          position: panel ? getComputedStyle(panel).position : null,
          top: panel ? getComputedStyle(panel).top : null,
          hit: document
            .elementFromPoint(r.x + r.width / 2, r.y + r.height / 2)
            ?.outerHTML.slice(0, 300),
        };
      }),
    ),
  });
  expect(
    await option.evaluate((element) => {
      const r = element.getBoundingClientRect();
      return element.contains(
        document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2),
      );
    }),
  ).toBe(true);
  await input.press("Escape");
  await expect(option).not.toBeVisible();
  await input.fill("no-such-ingredient-ever");
  await expect(page.getByText(/No ingredient found/)).toBeVisible();
  await input.press("Escape");
  await expect(page.getByText(/No ingredient found/)).not.toBeVisible();
  await page.route("**/api/ingredients?*", (route) =>
    route.fulfill({ status: 503, body: "{}" }),
  );
  await input.fill("failure");
  await expect(page.getByText(/Could not load ingredients/)).toBeVisible();
  await page.unroute("**/api/ingredients?*");
  await input.press("Escape");
  page.once("dialog", (dialog) => dialog.dismiss());
  await page
    .getByRole("button", { name: "Clear ingredient list", exact: true })
    .click();
  await expect(page.locator(".pantry-chips li")).toHaveCount(1);
  page.once("dialog", (dialog) => dialog.accept());
  await page
    .getByRole("button", { name: "Clear ingredient list", exact: true })
    .click();
  await expect(page.locator(".pantry-chips li")).toHaveCount(0);
  await expect(page.locator(".pantry-match")).toHaveCount(0);
  expect(errors).toEqual([]);
});
