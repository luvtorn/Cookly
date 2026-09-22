import { expect, test } from "@playwright/test";

test("detects, persists and switches the public locale", async ({
  page,
  context,
}) => {
  await context.clearCookies();
  const detectionResponse = await page.request.get("/", {
    headers: { "Accept-Language": "pl-PL,pl;q=0.9,en;q=0.7" },
    maxRedirects: 0,
  });
  expect(detectionResponse.status()).toBe(307);
  expect(detectionResponse.headers().location).toMatch(/\/pl$/);

  await page.goto("/pl");
  await expect(page.locator("html")).toHaveAttribute("lang", "pl");
  await expect(
    page.getByRole("heading", { name: "Gotujmy lepiej, razem." }),
  ).toBeVisible();

  await page.getByRole("combobox", { name: "Język" }).selectOption("ru");
  await expect(page).toHaveURL(/\/ru$/);
  await expect(page.locator("html")).toHaveAttribute("lang", "ru");
  await expect(
    page.getByRole("combobox", { name: "Поиск рецептов" }),
  ).toBeVisible();

  await page.goto("/");
  await expect(page).toHaveURL(/\/ru$/);
});

test("localized catalog keeps query parameters and auth modal routing", async ({
  page,
}) => {
  await page.goto("/pl/recipes?q=soup");
  await expect(page).toHaveURL(/\/pl\/recipes\?q=soup$/);
  await expect(page.locator("html")).toHaveAttribute("lang", "pl");
  await page.locator(".site-header .sign-in-button").click();
  await expect(page).toHaveURL(/\/pl\/auth\/sign-in/);
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page).toHaveURL(/\/pl\/recipes\?q=soup$/);
});

test("search suggestions paint above transformed recipe cards", async ({
  page,
}) => {
  await page.route("**/api/search/recipes**", (route) =>
    route.fulfill({
      json: {
        items: [
          {
            slug: "spinach-and-feta-omelette",
            title: "Spinach and Feta Omelette",
            image: "/images/lemon-pasta.webp",
            minutes: 15,
          },
        ],
      },
    }),
  );
  await page.goto("/en/recipes");
  await page.evaluate(() => {
    const card = document.createElement("article");
    card.className = "recipe-card glass";
    card.style.height = "260px";
    card.style.transform = "translateY(-3px)";
    document.querySelector(".recipes-section")?.prepend(card);
  });
  await page.getByRole("combobox", { name: "Search recipes" }).fill("spinach");
  const popover = page.locator(".recipe-search-popover");
  await expect(popover).toBeVisible();
  expect(
    await popover.evaluate((element) => {
      const rect = element.getBoundingClientRect();
      return (
        document
          .elementFromPoint(
            rect.left + rect.width / 2,
            rect.top + rect.height / 2,
          )
          ?.closest(".recipe-search-popover") === element
      );
    }),
  ).toBe(true);
});

test("collapsed desktop dock exposes complete circular icon wells", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1448, height: 800 });
  await page.goto("/en");
  await page.evaluate(() => window.scrollTo(0, 180));
  const wells = page.locator(".desktop-dock nav .dock-icon");
  await expect(wells.first()).toBeVisible();
  for (const well of await wells.all()) {
    const shape = await well.evaluate((element) => {
      const rect = element.getBoundingClientRect();
      return {
        width: rect.width,
        height: rect.height,
        radius: getComputedStyle(element).borderTopRightRadius,
      };
    });
    expect(shape.width).toBeCloseTo(shape.height, 3);
    expect(shape.width).toBeGreaterThanOrEqual(43.9);
    expect(Number.parseFloat(shape.radius)).toBeGreaterThanOrEqual(22);
  }
});
