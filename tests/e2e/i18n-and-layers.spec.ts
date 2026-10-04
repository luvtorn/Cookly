import { expect, test } from "@playwright/test";

test("filter menus remain above mobile navigation and inside the viewport", async ({
  page,
}) => {
  for (const width of [390, 768]) {
    await page.setViewportSize({ width, height: 800 });
    await page.goto("/ru/recipes");
    await page.getByText("Больше фильтров", { exact: true }).click();
    const trigger = page.getByRole("combobox", {
      name: "Сложность",
      exact: true,
    });
    await trigger.evaluate((element) => {
      window.scrollTo(
        0,
        window.scrollY + element.getBoundingClientRect().top - 610,
      );
    });
    await trigger.click();
    const menu = page.getByRole("listbox", { name: "Сложность" });
    await expect(menu).toBeVisible();
    const bounds = await menu.boundingBox();
    const nav = await page.locator(".mobile-bottom-navigation").boundingBox();
    expect(bounds).not.toBeNull();
    expect(nav).not.toBeNull();
    if (bounds && nav) {
      expect(bounds.y).toBeGreaterThanOrEqual(0);
      expect(bounds.y + bounds.height).toBeLessThanOrEqual(nav.y - 8);
    }
    await page.keyboard.press("Escape");
    await expect(trigger).toBeFocused();
  }
});

test("localized not-found pages retain the locale in the return link", async ({
  page,
}) => {
  for (const [locale, title, back] of [
    ["ru", "Этой страницы нет в меню.", "На главную"],
    ["pl", "Tej strony nie ma w menu.", "Wróć na stronę główną"],
  ]) {
    await page.goto(`/${locale}/missing-audit-page`);
    await expect(page.getByRole("heading", { name: title })).toBeVisible();
    await expect(
      page.locator("main").getByRole("link", { name: back }),
    ).toHaveAttribute("href", `/${locale}`);
  }
});

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

  await page.getByRole("button", { name: "Język: Polski" }).click();
  await page.getByRole("menuitemradio", { name: /Русский/ }).click();
  await expect(page).toHaveURL(/\/ru$/);
  await expect(page.locator("html")).toHaveAttribute("lang", "ru");
  await expect(
    page.getByRole("combobox", { name: "Поиск рецептов" }),
  ).toBeVisible();

  await page.goto("/");
  await expect(page).toHaveURL(/\/ru$/);
});

test("language menu keeps path, query and fragment and closes on Escape", async ({
  page,
}) => {
  await page.goto("/en/recipes?q=soup#catalog-results");
  const trigger = page.locator(".site-header .language-trigger");
  await trigger.click();
  await expect(page.getByRole("menu", { name: "Language" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("menu", { name: "Language" })).toHaveCount(0);
  await expect(trigger).toBeFocused();
  await trigger.click();
  await page.getByRole("menuitemradio", { name: /Polski/ }).click();
  await expect(page).toHaveURL(/\/pl\/recipes\?q=soup#catalog-results$/);
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

test("legacy account and profile routes keep a localized sign-in return", async ({
  page,
}) => {
  await page.goto("/ru/settings/profile");
  await expect(page).toHaveURL(
    /\/ru\/auth\/sign-in\?callbackUrl=%2Fru%2Fsettings%2Fprofile/,
  );
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.goto("/settings/account");
  await expect(page).toHaveURL(
    /\/ru\/auth\/sign-in\?callbackUrl=%2Fru%2Fsettings%2Faccount/,
  );
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

test("catalog filter dropdown uses the glass menu and keyboard selection", async ({
  page,
}, testInfo) => {
  await page.goto("/en/recipes");
  await page.getByText("More filters", { exact: true }).click();
  const difficulty = page.getByRole("combobox", { name: "Difficulty" });
  const cuisine = page.getByRole("combobox", { name: "Cuisine" });
  const cuisineBefore = await cuisine.boundingBox();
  await difficulty.focus();
  await page.keyboard.press("ArrowDown");
  await expect(page.getByRole("listbox", { name: "Difficulty" })).toBeVisible();
  const menuWidth = await page
    .getByRole("listbox", { name: "Difficulty" })
    .evaluate((menu) => menu.getBoundingClientRect().width);
  const triggerWidth = await difficulty.evaluate(
    (trigger) => trigger.getBoundingClientRect().width,
  );
  expect(menuWidth).toBeLessThanOrEqual(triggerWidth + 2);
  expect(
    await page
      .getByRole("listbox", { name: "Difficulty" })
      .evaluate((menu) => getComputedStyle(menu).position),
  ).toBe("absolute");
  const cuisineAfter = await cuisine.boundingBox();
  expect(
    Math.abs((cuisineAfter?.y ?? 0) - (cuisineBefore?.y ?? 0)),
  ).toBeLessThanOrEqual(1);
  await page.screenshot({ path: testInfo.outputPath("filter-menu-light.png") });
  await page.getByRole("option", { name: "Easy" }).click();
  await expect(difficulty).toContainText("Easy");
  await page.getByRole("button", { name: "Find recipes" }).click();
  await expect(page).toHaveURL(/difficulty=EASY/);
});

test("collapsed desktop dock exposes complete circular icon wells", async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 1448, height: 800 });
  await page.goto("/en");
  await page.evaluate(() => window.scrollTo(0, 180));
  const wells = page.locator(".desktop-dock nav .dock-icon");
  await expect(wells.first()).toBeVisible();
  // Visibility occurs during entrance motion; measure the final geometry.
  await expect
    .poll(() =>
      wells
        .first()
        .evaluate((element) => element.getBoundingClientRect().width),
    )
    .toBeGreaterThanOrEqual(43.9);
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
  for (const selector of [
    ".theme-toggle .dock-icon",
    ".language-trigger .dock-icon",
  ]) {
    const well = page.locator(`.desktop-dock ${selector}`);
    const bounds = await well.boundingBox();
    expect(bounds?.width).toBeCloseTo(bounds?.height ?? 0, 3);
    expect(bounds?.width).toBeGreaterThanOrEqual(43.9);
  }
  const contentBefore = await page.locator(".home-container").boundingBox();
  const collapsed = await page.locator(".desktop-dock-surface").boundingBox();
  expect(
    (contentBefore?.x ?? 0) - (collapsed ? collapsed.x + collapsed.width : 0),
  ).toBeGreaterThanOrEqual(12);
  await page.locator(".desktop-dock-surface").hover();
  await expect(page.locator(".desktop-dock .dock-create")).toContainText(
    "New recipe",
  );
  const geometry = await page.evaluate(() => {
    const dock = document
      .querySelector(".desktop-dock-surface")
      ?.getBoundingClientRect();
    const content = document
      .querySelector(".home-container")
      ?.getBoundingClientRect();
    const icon = document
      .querySelector(".desktop-dock .dock-create .dock-icon")
      ?.getBoundingClientRect();
    const label = document
      .querySelector(".desktop-dock .dock-create > span:last-child")
      ?.getBoundingClientRect();
    return {
      gap: content && dock ? content.left - dock.right : -1,
      alignment:
        icon && label
          ? Math.abs(icon.y + icon.height / 2 - label.y - label.height / 2)
          : 100,
    };
  });
  // The expanded labels intentionally overlay the gutter; content never shifts.
  expect((await page.locator(".home-container").boundingBox())?.x).toBe(
    contentBefore?.x,
  );
  expect(geometry.alignment).toBeLessThanOrEqual(1);
  await page.screenshot({ path: testInfo.outputPath("dock-light.png") });
  await page.locator(".desktop-dock .theme-toggle").click();
  await expect(page.locator("html")).toHaveClass(/dark/);
  await page.locator(".desktop-dock-surface").hover();
  await page.screenshot({ path: testInfo.outputPath("dock-dark.png") });
});

test("dock expansion keeps every icon stationary throughout the transition", async ({
  page,
}) => {
  for (const width of [1100, 1448]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/ru");
    await page.evaluate(() => window.scrollTo(0, 200));
    const dock = page.locator(".desktop-dock-surface");
    await expect(dock).toBeVisible();
    await expect(dock).toHaveCSS("width", "64px");
    // Wait for the separate entrance animation before measuring expansion.
    await expect(page.locator(".desktop-dock")).toHaveCSS("opacity", "1");
    for (const theme of ["light", "dark"]) {
      await page.evaluate((value) => {
        document.documentElement.classList.toggle("dark", value === "dark");
      }, theme);
      const baseline = await page
        .locator(".desktop-dock .dock-icon")
        .evaluateAll((icons) =>
          icons.map((icon) => {
            const rect = icon.getBoundingClientRect();
            return {
              x: rect.x,
              y: rect.y,
              width: rect.width,
              height: rect.height,
            };
          }),
        );
      expect(baseline).toHaveLength(7);
      const bounds = await dock.boundingBox();
      if (!bounds) throw new Error("Dock must have visible bounds");
      for (const expanded of [true, false]) {
        await page.mouse.move(
          expanded ? bounds.x + 25 : width - 20,
          expanded ? bounds.y + 25 : 20,
        );
        const frames = await page.evaluate(async () => {
          const samples: {
            x: number;
            y: number;
            width: number;
            height: number;
          }[][] = [];
          const start = performance.now();
          while (performance.now() - start < 420) {
            await new Promise<void>((resolve) =>
              requestAnimationFrame(() => resolve()),
            );
            samples.push(
              Array.from(
                document.querySelectorAll(".desktop-dock .dock-icon"),
                (icon) => {
                  const rect = icon.getBoundingClientRect();
                  return {
                    x: rect.x,
                    y: rect.y,
                    width: rect.width,
                    height: rect.height,
                  };
                },
              ),
            );
          }
          return samples;
        });
        for (const frame of frames)
          for (const [index, icon] of frame.entries()) {
            for (const property of ["x", "y", "width", "height"] as const)
              expect(
                Math.abs(icon[property] - baseline[index][property]),
              ).toBeLessThanOrEqual(0.6);
          }
        await expect(dock).toHaveCSS("width", expanded ? "208px" : "64px");
      }
    }
    await page.locator(".desktop-dock .theme-toggle").focus();
    await expect(dock).toHaveCSS("width", "208px");
    await expect(
      page.locator(".desktop-dock .theme-toggle .dock-icon"),
    ).toHaveCSS("outline-width", "2px");
    await page.emulateMedia({ reducedMotion: "reduce" });
    expect(
      await dock.evaluate((element) =>
        parseFloat(getComputedStyle(element).transitionDuration),
      ),
    ).toBeLessThan(0.01);
    await page.emulateMedia({ reducedMotion: "no-preference" });
  }
});
