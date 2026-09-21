import { expect, test } from "@playwright/test";

test.use({ video: "on" });

test.describe("touch glass", () => {
  test.use({
    hasTouch: true,
    isMobile: true,
    viewport: { width: 320, height: 680 },
  });
  test("mobile Sign in is circular and highlights only during touch", async ({
    page,
  }) => {
    await page.goto("/");
    const button = page.locator(".sign-in-button");
    await expect(button).toHaveAttribute("data-lens", "ready");
    const box = await button.boundingBox();
    if (!box) throw new Error("Missing Sign in bounds");
    expect(box.width).toBe(box.height);
    expect(
      await button.evaluate(
        (element) => getComputedStyle(element).borderRadius,
      ),
    ).toBe("50%");
    const touch = await page.context().newCDPSession(page);
    await touch.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: [{ x: box.x + box.width / 2, y: box.y + box.height / 2 }],
    });
    await expect
      .poll(() =>
        button.evaluate(
          (element) => getComputedStyle(element, "::after").opacity,
        ),
      )
      .toBe("1");
    expect(
      await button.evaluate((element) =>
        element.style.getPropertyValue("--glint-x"),
      ),
    ).toBe("");
    await touch.send("Input.dispatchTouchEvent", {
      type: "touchEnd",
      touchPoints: [],
    });
    await expect(page.locator(".auth-modal")).toHaveCSS("opacity", "1");
    await touch.detach();
  });
});

for (const theme of ["light", "dark"] as const) {
  test(`glass controls track the pointer and retain reflections in ${theme}`, async ({
    page,
  }, testInfo) => {
    await page.emulateMedia({
      colorScheme: theme,
      reducedMotion: "no-preference",
    });
    await page.goto("/");
    for (const selector of [
      ".category-card",
      ".button-primary",
      ".sign-in-button",
      ".search-submit",
    ]) {
      const control = page.locator(selector).first();
      await control.scrollIntoViewIfNeeded();
      await expect(control).toHaveAttribute("data-lens", "ready");
      await control.hover({ position: { x: 10, y: 10 } });
      await expect
        .poll(() =>
          control.evaluate(
            (element) => getComputedStyle(element, "::after").opacity,
          ),
        )
        .toBe("1");
      const box = await control.boundingBox();
      if (!box) throw new Error("Missing control bounds");
      await page.mouse.move(box.x + box.width - 12, box.y + box.height - 10, {
        steps: 24,
      });
      await expect
        .poll(() =>
          control.evaluate((element) =>
            parseFloat(element.style.getPropertyValue("--glint-x")),
          ),
        )
        .toBeGreaterThan(box.width / 2);
      await control.screenshot({
        path: testInfo.outputPath(`${selector.slice(1)}-hover.png`),
      });
      expect(
        await control.evaluate(
          (element) => getComputedStyle(element, "::before").backgroundImage,
        ),
      ).toContain("gradient");
      await page.mouse.move(0, 0);
      await expect
        .poll(() =>
          control.evaluate(
            (element) => getComputedStyle(element, "::after").opacity,
          ),
        )
        .toBe("0");
    }
    await page.emulateMedia({ reducedMotion: "reduce" });
    const signIn = page.locator(".sign-in-button");
    await signIn.hover();
    expect(
      await signIn.evaluate((element) =>
        element.style.getPropertyValue("--glint-x"),
      ),
    ).toBe("");
    await signIn.focus();
    expect(
      await signIn.evaluate(
        (element) => getComputedStyle(element).outlineStyle,
      ),
    ).toBe("solid");
  });
}

test("switching forms and validation never resize or remount the desktop photo", async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 1448, height: 900 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/auth/sign-in");
  const modal = page.locator(".auth-modal");
  const photo = page.locator(".auth-modal-photo");
  await expect(modal).toBeVisible();
  const initial = {
    modal: await modal.boundingBox(),
    photo: await photo.boundingBox(),
  };
  const original = await photo.elementHandle();
  await page
    .getByRole("navigation", { name: "Account access" })
    .getByRole("link", { name: "Create account" })
    .click();
  await expect(page.getByLabel("Display name", { exact: true })).toBeVisible();
  expect(await original?.evaluate((element) => element.isConnected)).toBe(true);
  expect(await modal.boundingBox()).toEqual(initial.modal);
  expect(await photo.boundingBox()).toEqual(initial.photo);
  await page
    .getByLabel("Display name", { exact: true })
    .fill(
      "A very long display name that still fits the supported eighty character limit",
    );
  await page
    .getByRole("button", { name: "Create account", exact: true })
    .click();
  await expect(page.getByLabel("Username", { exact: true })).toHaveAttribute(
    "aria-invalid",
    "true",
  );
  expect(await modal.boundingBox()).toEqual(initial.modal);
  expect(await photo.boundingBox()).toEqual(initial.photo);
  await page.screenshot({
    path: testInfo.outputPath("desktop-validation.png"),
  });
  await page.setViewportSize({ width: 1100, height: 540 });
  await page.getByLabel("Confirm password").fill("a long test phrase");
  await expect(
    page.getByRole("button", { name: "Close authentication" }),
  ).toBeInViewport();
  await expect.poll(async () => (await modal.boundingBox())?.height).toBe(492);
  await page.screenshot({ path: testInfo.outputPath("desktop-short.png") });
  await page.keyboard.press("Escape");
  await expect(page).toHaveURL("/");
});
