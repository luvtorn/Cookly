// Isolated optical fixture: no app, database, credentials or external assets.
import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";
import assert from "node:assert/strict";
import { createLensMap } from "../src/components/shared/lens-map.ts";

await mkdir("test-results/glass-optics", { recursive: true });
const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 760, height: 360 } });
  await page.setContent(`<style>
    body { margin:0; background:repeating-conic-gradient(#152e2c 0% 25%,#f6f0bd 0% 50%) 0 0/32px 32px; }
    .lens { position:absolute; left:60px; top:100px; width:640px; height:140px;
      border-radius:50px; isolation:isolate; font:600 24px Arial; display:grid;place-items:center; }
    .lens::before { content:'';position:absolute;inset:0;border-radius:inherit;z-index:-1;
      backdrop-filter:url("#lens");background:#ffffff18;box-shadow:inset 0 2px 2px #fff; }
    span { background:#fff; padding:12px; border-radius:8px; transform:translateZ(0); }
    svg { position:absolute;width:0;height:0; }
  </style><svg xmlns="http://www.w3.org/2000/svg"><defs><filter id="lens" x="0" y="0" width="640" height="140" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB"><feImage width="640" height="140" result="map"/><feDisplacementMap in="SourceGraphic" in2="map" scale="0" xChannelSelector="R" yChannelSelector="G"/></filter></defs></svg><div class="lens"><span>Unfiltered text · lens only at the rim</span></div>`);
  const pixels = Array.from(createLensMap(640, 140, 50));
  await page.evaluate((data) => {
    const canvas = document.createElement("canvas");
    canvas.width = 640;
    canvas.height = 140;
    canvas
      .getContext("2d")
      .putImageData(new ImageData(new Uint8ClampedArray(data), 640, 140), 0, 0);
    document.querySelector("feImage").setAttribute("href", canvas.toDataURL());
  }, pixels);
  const flat = await page.screenshot({
    path: "test-results/glass-optics/flat.png",
  });
  await page
    .locator("feDisplacementMap")
    .evaluate((element) => element.setAttribute("scale", "22"));
  const refracted = await page.screenshot({
    path: "test-results/glass-optics/refracted.png",
  });
  const changes = await page.evaluate(
    async ({ before, after }) => {
      const decode = async (data) => {
        const bitmap = await createImageBitmap(
          new Blob([new Uint8Array(data)], { type: "image/png" }),
        );
        const canvas = document.createElement("canvas");
        canvas.width = bitmap.width;
        canvas.height = bitmap.height;
        const context = canvas.getContext("2d");
        context.drawImage(bitmap, 0, 0);
        bitmap.close();
        return context.getImageData(0, 0, canvas.width, canvas.height).data;
      };
      const a = await decode(before);
      const b = await decode(after);
      let rim = 0;
      let text = 0;
      for (let y = 100; y < 240; y++) {
        for (let x = 60; x < 700; x++) {
          const i = (y * 760 + x) * 4;
          const difference =
            Math.abs(a[i] - b[i]) +
            Math.abs(a[i + 1] - b[i + 1]) +
            Math.abs(a[i + 2] - b[i + 2]);
          if (difference >= 30 && (x < 120 || x > 640 || y < 125 || y > 215))
            rim++;
          if (difference > 0 && x > 180 && x < 580 && y > 145 && y < 190)
            text++;
        }
      }
      return { rim, text };
    },
    { before: Array.from(flat), after: Array.from(refracted) },
  );
  assert(
    changes.rim > 1000,
    "The lens must visibly displace the checkerboard, not merely accept CSS",
  );
  assert.equal(changes.text, 0, "Text must remain pixel-identical");
  console.log(
    `Optical check: ${changes.rim} changed rim pixels, ${changes.text} changed text pixels.`,
  );
  console.log(
    "Saved flat/refracted contrast fixtures to test-results/glass-optics.",
  );
} finally {
  await browser.close();
}
