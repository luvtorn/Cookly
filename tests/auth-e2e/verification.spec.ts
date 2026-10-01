import { test, expect } from "@playwright/test";
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
  throw new Error("Isolated cookly_test required");
const db = new PrismaClient({
  adapter: new PrismaPg({ connectionString: url }),
});
const run = randomUUID().slice(0, 8),
  password = `test-${randomUUID()}`;
const authorEmail = `verify-${run}@example.test`,
  adminEmail = `verify-admin-${run}@example.test`;
let author = "",
  admin = "",
  recipe = "",
  category = "",
  ingredient = "";
test.beforeAll(async () => {
  const passwordHash = await hashPassword(password);
  author = (
    await db.user.create({
      data: {
        email: authorEmail,
        passwordHash,
        profile: {
          create: { username: `verify_${run}`, displayName: "Review Cook" },
        },
      },
    })
  ).id;
  admin = (
    await db.user.create({
      data: { email: adminEmail, passwordHash, role: "ADMIN" },
    })
  ).id;
  category = (
    await db.category.create({
      data: { name: `Review ${run}`, slug: `review-${run}` },
    })
  ).id;
  ingredient = (
    await db.ingredient.create({
      data: {
        name: `Review tomato ${run}`,
        normalizedName: `review tomato ${run}`,
        slug: `review-tomato-${run}`,
      },
    })
  ).id;
  recipe = (
    await db.recipe.create({
      data: {
        title: `Review soup ${run}`,
        slug: `review-soup-${run}`,
        description: "A clear recipe awaiting editorial review.",
        authorId: author,
        categoryId: category,
        coverImageUrl: "/images/tomato-soup.webp",
        coverImageKey: "test/review",
        status: "PUBLISHED",
        servings: 2,
        prepMinutes: 5,
        cookMinutes: 10,
        difficulty: "EASY",
        ingredients: {
          create: {
            ingredientId: ingredient,
            amount: 2,
            unit: "g",
            position: 0,
          },
        },
        steps: {
          create: {
            instruction: "Cook the tomatoes and serve warm.",
            position: 0,
          },
        },
      },
    })
  ).id;
});
test.afterAll(async () => {
  await db.moderationAction.deleteMany({ where: { actorId: admin } });
  await db.user.deleteMany({
    where: { id: { in: [author, admin].filter(Boolean) } },
  });
  if (ingredient) await db.ingredient.delete({ where: { id: ingredient } });
  if (category) await db.category.delete({ where: { id: category } });
  await db.$disconnect();
});
test("author request → changes → edit → resubmit → approval → revoke, with private feedback", async ({
  page,
  browser,
}, testInfo) => {
  test.setTimeout(300000);
  await page.goto(`/en/my-recipes/${recipe}/edit`);
  await page.getByLabel("Email address", { exact: true }).fill(authorEmail);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`/my-recipes/${recipe}/edit$`));
  const request = async () => {
    await page.locator(".owner-verification summary").click();
    await page
      .getByLabel("Message to the editor (optional)")
      .fill("Please check my instructions.");
    await page
      .getByRole("button", { name: "Request Cookly review", exact: true })
      .click();
    await expect(page.locator(".owner-verification strong").first()).toHaveText(
      "Awaiting review",
    );
  };
  await request();
  const adminContext = await browser.newContext({
    baseURL: "http://localhost:3101",
  });
  const studio = await adminContext.newPage();
  try {
    await studio.goto("/admin/verification");
    await studio.getByLabel("Email address", { exact: true }).fill(adminEmail);
    await studio.getByLabel("Password", { exact: true }).fill(password);
    await studio.getByRole("button", { name: "Sign in", exact: true }).click();
    await expect(studio).toHaveURL(/\/admin(?:\/verification)?$/, {
      timeout: 15000,
    });
    await studio
      .getByRole("link", { name: "Verification", exact: true })
      .click();
    await expect(studio).toHaveURL(/\/admin\/verification$/);
    await studio
      .getByLabel("Search by recipe or username")
      .fill(`verify_${run}`);
    await studio.getByRole("button", { name: "Search", exact: true }).click();
    const item = studio.locator(".verification-item").filter({ hasText: run });
    await expect(item).toContainText("Please check my instructions.");
    for (const theme of ["light", "dark"])
      for (const width of [390, 768, 1100, 1448]) {
        await studio.setViewportSize({ width, height: 900 });
        await studio.evaluate(
          (theme) =>
            document.documentElement.classList.toggle("dark", theme === "dark"),
          theme,
        );
        expect(
          await studio.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
        ).toBe(true);
        await studio.screenshot({
          path: testInfo.outputPath(`queue-${theme}-${width}.png`),
          fullPage: true,
        });
      }
    await item.getByText("Review recipe", { exact: true }).click();
    await item
      .getByRole("combobox", { name: "New verification status" })
      .click();
    await item
      .getByRole("option", { name: "Needs changes", exact: true })
      .click();
    await item
      .getByRole("button", { name: "Save verification status", exact: true })
      .click();
    await expect(item.getByRole("status")).toContainText(
      "explain to the author",
    );
    await item
      .getByLabel("Message to author", { exact: true })
      .fill("Please clarify quantities.");
    await item
      .getByLabel("Private review note", { exact: true })
      .fill("Private editor-only evidence");
    await item
      .getByRole("button", { name: "Save verification status", exact: true })
      .click();
    await expect(item).toHaveCount(0);
    await page.reload();
    await expect(page.locator(".owner-verification")).toContainText(
      "Please clarify quantities.",
    );
    expect(await page.content()).not.toContain("Private editor-only evidence");
    await expect(page.locator(".owner-verification summary")).toHaveCount(0);
    for (const [locale, width] of [
      ["ru", 390],
      ["pl", 768],
      ["en", 1448],
    ] as const) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(`/${locale}/my-recipes`);
      await expect(page.locator(".owner-verification")).toContainText(
        "Please clarify quantities.",
      );
      expect(await page.content()).not.toContain(
        "Private editor-only evidence",
      );
      for (const theme of ["light", "dark"]) {
        await page.evaluate(
          (theme) =>
            document.documentElement.classList.toggle("dark", theme === "dark"),
          theme,
        );
        expect(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
        ).toBe(true);
        await page.screenshot({
          path: testInfo.outputPath(`owner-${locale}-${theme}-${width}.png`),
          fullPage: true,
        });
      }
    }
    await page.goto(`/en/my-recipes/${recipe}/edit`);
    await page
      .getByLabel("Title", { exact: true })
      .fill(`Clarified soup ${run}`);
    await page
      .getByRole("button", { name: "Save recipe →", exact: true })
      .click();
    await expect(page.locator(".owner-verification strong").first()).toHaveText(
      "Not reviewed",
    );
    await request();
    await studio.reload();
    await item.getByText("Review recipe", { exact: true }).click();
    await item
      .getByRole("combobox", { name: "New verification status" })
      .click();
    await item.getByRole("option", { name: "Verified", exact: true }).click();
    await item
      .getByRole("button", { name: "Save verification status" })
      .click();
    await expect(item).toHaveCount(0);
    await studio.getByRole("link", { name: /^Verified/ }).click();
    await expect(item).toHaveCount(1);
    await item.getByText("Recent decisions (up to 5)", { exact: true }).click();
    await item.getByRole("link", { name: "Browse full history →" }).click();
    await expect(
      studio.getByRole("heading", {
        name: "Verification history",
        exact: true,
      }),
    ).toBeVisible();
    await expect(studio.locator(".verification-history")).toContainText(
      "Private editor-only evidence",
    );
    await studio.goBack();
    await expect(item).toHaveCount(1);
    await page.goto(`/en/recipes/review-soup-${run}`);
    await expect(page.locator(".verified-badge")).toBeVisible();
    expect(await page.content()).not.toContain("Please clarify quantities.");
    expect(await page.content()).not.toContain("Private editor-only evidence");
    await item.getByText("Review recipe", { exact: true }).click();
    await item
      .getByLabel("Message to author", { exact: true })
      .fill("Please revisit the serving quantities.");
    studio.once("dialog", (dialog) => dialog.accept());
    await item
      .getByRole("combobox", { name: "New verification status" })
      .click();
    await item
      .getByRole("option", { name: "Needs changes", exact: true })
      .click();
    await item
      .getByRole("button", { name: "Save verification status" })
      .click();
    await expect(item).toHaveCount(0);
    await page.reload();
    await expect(page.locator(".verified-badge")).toHaveCount(0);
    await expect(
      page.getByRole("heading", { name: `Clarified soup ${run}`, exact: true }),
    ).toBeVisible();
    await studio.goto(`/admin/recipes?q=verify_${run}`);
    await expect(studio.locator(".admin-catalog-row")).toHaveCount(1);
    await studio
      .getByRole("link", { name: `View Clarified soup ${run}` })
      .click();
    await expect(studio).toHaveURL(new RegExp(`/admin/recipes/${recipe}$`));
    for (const [target, label] of [
      ["VERIFIED", "Verified"],
      ["PENDING", "Pending"],
      ["REJECTED", "Needs changes"],
      ["VERIFIED", "Verified"],
      ["NONE", "Not reviewed"],
    ] as const) {
      await studio
        .getByRole("combobox", { name: "New verification status" })
        .click();
      await studio.getByRole("option", { name: label, exact: true }).click();
      await studio
        .getByLabel("Message to author", { exact: true })
        .fill(`Admin decision: ${target}`);
      const previous = await db.recipe.findUniqueOrThrow({
        where: { id: recipe },
      });
      if (previous.verificationStatus === "VERIFIED")
        studio.once("dialog", (dialog) => dialog.accept());
      await studio
        .getByRole("button", { name: "Save verification status" })
        .click();
      await expect(studio.locator(".verification-form")).toContainText(
        `Current status: ${label}`,
      );
      expect(
        await db.recipe.findUniqueOrThrow({ where: { id: recipe } }),
      ).toMatchObject({
        status: "PUBLISHED",
        isHidden: false,
        verificationStatus: target,
      });
      if (target === "PENDING") {
        expect(
          await db.recipeVerificationRequest.findFirstOrThrow({
            where: { recipeId: recipe, status: "PENDING" },
          }),
        ).toMatchObject({ requestedById: admin });
        await studio.goto(`/admin/verification?q=verify_${run}`);
        await expect(studio.locator(".verification-item")).toContainText(
          "Admin-initiated review",
        );
        await studio.goto(`/admin/recipes/${recipe}`);
      }
    }
    for (const theme of ["light", "dark"])
      for (const width of [390, 768, 1100, 1448]) {
        await studio.setViewportSize({ width, height: 900 });
        await studio.evaluate(
          (theme) =>
            document.documentElement.classList.toggle("dark", theme === "dark"),
          theme,
        );
        expect(
          await studio.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
        ).toBe(true);
        await studio.evaluate(() => scrollTo(0, 0));
        await studio.screenshot({
          path: testInfo.outputPath(`private-preview-${theme}-${width}.png`),
          fullPage: true,
        });
      }
    await page.goto("/en/my-recipes");
    await expect(page.locator(".owner-verification")).toContainText(
      "Admin decision: NONE",
    );
    await studio.goto(`/admin/recipes?status=ALL&q=verify_${run}`);
    await expect(studio.locator(".admin-catalog-row")).toHaveCount(1);
    await studio.getByRole("link", { name: "My Studio", exact: true }).click();
    await expect(studio.locator(".admin-recipe-list li")).toHaveCount(0);
    const source = await db.recipe.findUniqueOrThrow({
      where: { id: recipe },
      select: {
        authorId: true,
        categoryId: true,
        description: true,
        coverImageUrl: true,
        coverImageKey: true,
        servings: true,
        prepMinutes: true,
        cookMinutes: true,
        difficulty: true,
      },
    });
    await db.recipe.createMany({
      data: Array.from({ length: 13 }, (_, index) => ({
        ...source,
        title: `Catalog ${run} ${index}`,
        slug: `catalog-${run}-${index}`,
        status: "PUBLISHED" as const,
        isHidden: index === 0,
      })),
    });
    await studio.goto(`/admin/recipes?q=Catalog+${run}`);
    await expect(studio.locator(".admin-catalog-row")).toHaveCount(12);
    await studio.getByRole("link", { name: "Next", exact: true }).click();
    await expect(studio.locator(".admin-catalog-row")).toHaveCount(1);
    await studio
      .getByRole("combobox", { name: "Visibility", exact: true })
      .click();
    await studio.getByRole("option", { name: "Hidden", exact: true }).click();
    await studio.getByRole("button", { name: "Apply filters" }).click();
    await expect(studio).not.toHaveURL(/page=2/);
    await expect(studio.locator(".admin-catalog-row")).toHaveCount(1);
    for (const theme of ["light", "dark"])
      for (const width of [390, 768, 1100, 1448]) {
        await studio.setViewportSize({ width, height: 900 });
        await studio.evaluate(
          (theme) =>
            document.documentElement.classList.toggle("dark", theme === "dark"),
          theme,
        );
        expect(
          await studio.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
        ).toBe(true);
        await studio.screenshot({
          path: testInfo.outputPath(`catalog-${theme}-${width}.png`),
          fullPage: true,
        });
      }
    await db.recipe.update({
      where: { id: recipe },
      data: { status: "DRAFT" },
    });
    await studio.goto(`/admin/recipes/${recipe}`);
    await expect(
      studio.getByText("Only published recipes can be reviewed."),
    ).toBeVisible();
    await expect(studio.locator(".verification-form")).toHaveCount(0);
    await page.goto(`/admin/recipes/${recipe}`);
    await expect(page.locator(".admin-recipe-preview")).toHaveCount(0);
  } finally {
    await adminContext.close();
  }
});
