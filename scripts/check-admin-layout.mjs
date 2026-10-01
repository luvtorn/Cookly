import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { chromium } from "@playwright/test";

// Geometry regression: short admin pages must not vertically center their header.
const css = await readFile(
  new URL("../src/app/recipes.css", import.meta.url),
  "utf8",
);
const browser = await chromium.launch();
try {
  const page = await browser.newPage();
  for (const width of [390, 768, 1100, 1448]) {
    await page.setViewportSize({ width, height: 900 });
    for (const height of [120, 360, 1800]) {
      await page.setContent(`<style>*{box-sizing:border-box}body{margin:0}${css}</style>
        <div class="admin-shell">
          <aside class="admin-sidebar">Cookly</aside>
          <div class="admin-workspace">
            <header class="admin-topbar">Cookly studio</header>
            <main style="height:${height}px">Verification</main>
          </div>
        </div>`);
      const top = await page
        .locator(".admin-topbar")
        .evaluate((element) => element.getBoundingClientRect().top);
      if (width >= 768)
        assert.equal(top, 16, `Header top at ${width}px / content ${height}px`);
      else assert.ok(top < 180, "Mobile header follows the compact sidebar");
      assert.ok(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
        "No overflow",
      );
      if (height === 1800) {
        await page.evaluate(() => window.scrollTo(0, 450));
        const stickyTop = await page
          .locator(".admin-topbar")
          .evaluate((element) => element.getBoundingClientRect().top);
        assert.ok(
          Math.abs(stickyTop - (width >= 768 ? 16 : 9.6)) < 1,
          "Header remains sticky",
        );
      }
    }
  }
  console.log(
    "Admin layout: 12 responsive content cases passed, including sticky scrolling.",
  );
} finally {
  await browser.close();
}
