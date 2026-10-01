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
  throw new Error("Social E2E requires isolated cookly_test");
const db = new PrismaClient({
  adapter: new PrismaPg({ connectionString: url }),
});
const run = randomUUID().slice(0, 8);
const email = `social-e2e-${run}@example.test`;
const password = `local-test-${randomUUID()}`;
const slug = `social-e2e-${run}`;
let owner = "",
  category = "",
  recipe = "";
test.beforeAll(async () => {
  owner = (
    await db.user.create({
      data: {
        email,
        passwordHash: await hashPassword(password),
        status: "ACTIVE",
        profile: {
          create: {
            username: `social_${run}`,
            displayName: "Social Test Cook",
          },
        },
      },
    })
  ).id;
  category = (
    await db.category.create({
      data: { name: `Social ${run}`, slug: `social-${run}` },
    })
  ).id;
  recipe = (
    await db.recipe.create({
      data: {
        authorId: owner,
        categoryId: category,
        slug,
        title: `Social test soup ${run}`,
        description: "A warm bowl of roasted tomato soup with basil.",
        coverImageUrl: "/images/tomato-soup.webp",
        servings: 2,
        prepMinutes: 10,
        cookMinutes: 20,
        difficulty: "EASY",
        status: "PUBLISHED",
        publishedAt: new Date(),
        steps: {
          create: {
            position: 0,
            instruction: "Simmer the tomatoes and serve warm.",
          },
        },
      },
    })
  ).id;
});
test.afterAll(async () => {
  if (owner) await db.user.delete({ where: { id: owner } });
  if (category) await db.category.delete({ where: { id: category } });
  await db.$disconnect();
});
test("guest modal return → save → Saved → like → comment lifecycle and responsive QA", async ({
  page,
  browser,
}, testInfo) => {
  test.setTimeout(180000);
  await page.goto(`/en/recipes?q=${run}`);
  await expect(page.locator(".recipe-reactions--compact")).toHaveCSS(
    "position",
    "absolute",
  );
  await expect(page.locator(".recipe-reactions--compact")).toHaveCSS(
    "z-index",
    "5",
  );
  await page
    .locator(".recipe-card")
    .getByRole("link", { name: "Save recipe", exact: true })
    .click({ timeout: 10000 });
  await expect(page.locator("dialog[open]")).toBeVisible();
  await page.getByLabel("Email address", { exact: true }).fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`/en/recipes\\?q=${run}$`));
  const card = page.locator(".recipe-card");
  await card.getByRole("button", { name: "Save recipe", exact: true }).click();
  await expect(
    card.getByRole("button", { name: "Remove from saved" }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(
    card.getByRole("button", { name: "Like recipe", exact: true }),
  ).toBeEnabled();
  await card.getByRole("button", { name: "Like recipe", exact: true }).focus();
  await page.keyboard.press("Enter");
  await expect(card.getByRole("button", { name: "Remove like" })).toHaveText(
    "1",
  );
  await expect(card.getByRole("button", { name: "Remove like" })).toBeEnabled();
  await page.reload();
  await expect(
    card.getByRole("button", { name: "Remove like" }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.goto(`/en/saved?q=${run}`);
  await expect(card).toHaveCount(1);
  await page.getByRole("link", { name: "Liked recipes", exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`/en/saved\\?view=liked&q=${run}$`));
  await expect(
    page.getByRole("heading", { name: "Liked recipes", exact: true }),
  ).toBeVisible();
  await expect(card).toHaveCount(1);
  await page.getByRole("link", { name: "Saved recipes", exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`/en/saved\\?q=${run}$`));
  await expect(
    page.getByRole("heading", { name: "Saved recipes", exact: true }),
  ).toBeVisible();
  await card
    .getByRole("link", { name: `Social test soup ${run}`, exact: true })
    .click();
  await expect(page).toHaveURL(/\/recipes\/social-e2e-.*from=/);
  await expect(page.locator("main > a").first()).toHaveAttribute(
    "href",
    `/en/saved?q=${run}`,
  );
  await page.goBack();
  await expect(page).toHaveURL(new RegExp(`/en/saved\\?q=${run}$`));
  await page.goForward();
  await expect(page).toHaveURL(/\/recipes\/social-e2e-.*from=/);
  await page
    .getByLabel("Your comment", { exact: true })
    .fill("My first real comment");
  await page.getByRole("button", { name: "Post comment" }).click();
  await expect(page.locator(".comment-body")).toHaveText(
    "My first real comment",
  );
  await page
    .locator(".comment-controls")
    .getByRole("button", { name: "Edit", exact: true })
    .click();
  await page
    .locator(".comment-content textarea")
    .fill("Edited comment with a longer explanation.");
  await page
    .locator(".comment-content")
    .getByRole("button", { name: "Save changes" })
    .click();
  await expect(page.locator(".comment-body")).toHaveText(
    "Edited comment with a longer explanation.",
  );
  await expect(page.locator(".comment-author")).toContainText("edited");

  for (const width of [390, 768, 1100, 1448]) {
    await page.setViewportSize({ width, height: 900 });
    for (const theme of ["light", "dark"] as const) {
      await page.emulateMedia({ colorScheme: theme, reducedMotion: "reduce" });
      await page.evaluate((theme) => {
        localStorage.setItem("theme", theme);
      }, theme);
      for (const locale of ["en", "ru", "pl"]) {
        await page.goto(`/${locale}/saved`);
        await expect(page.locator(".recipe-card")).toHaveCount(1);
        await expect(page.locator(".recipe-card")).toBeVisible();
        await expect(page.locator(".loading-shell")).toHaveCount(0);
        await page
          .locator(".recipe-card img")
          .first()
          .evaluate(async (image) => {
            if (image instanceof HTMLImageElement) await image.decode();
          });
        await page.evaluate(() => document.fonts.ready);
        expect(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
        ).toBe(true);
        await page.screenshot({
          path: testInfo.outputPath(`saved-${width}-${theme}-${locale}.png`),
          fullPage: true,
        });
        await page.goto(`/${locale}/recipes/${slug}`);
        await page.locator(".recipe-community").scrollIntoViewIfNeeded();
        expect(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
        ).toBe(true);
        await page.screenshot({
          path: testInfo.outputPath(`comments-${width}-${theme}-${locale}.png`),
        });
      }
    }
  }
  await page.goto(`/en/recipes/${slug}`);
  await page
    .locator(".comment-controls")
    .getByRole("button", { name: "Delete" })
    .click();
  await expect(page.getByText("Delete this comment?")).toBeVisible();
  await page
    .locator(".comment-controls")
    .getByRole("button", { name: "Delete" })
    .click();
  await expect(page.locator(".comment-body")).toHaveCount(0);
  await page.getByRole("button", { name: "Remove like" }).click();
  await expect(
    page.getByRole("button", { name: "Like recipe", exact: true }),
  ).toHaveText("0");
  await page.goto("/en/saved");
  await card.getByRole("button", { name: "Remove from saved" }).click();
  await expect(card).toHaveCount(0);
  expect(
    await db.comment.count({ where: { recipeId: recipe, isHidden: true } }),
  ).toBe(1);
  const guest = await browser.newPage();
  await guest.goto(`http://localhost:3101/en/recipes/${slug}`);
  await expect(guest.locator(".comment-controls")).toHaveCount(0);
  await guest.goto("http://localhost:3101/en/saved?q=soup");
  await expect(guest).toHaveURL(/auth\/sign-in\?callbackUrl/);
  await guest.close();
});
