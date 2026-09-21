import { describe, expect, it } from "vitest";
import { createLensMap } from "./lens-map";

describe("rounded glass lens", () => {
  it("leaves the center neutral and bends opposite edges in opposite directions", () => {
    const width = 200;
    const pixels = createLensMap(width, 100, 24);
    const point = (x: number, y: number) =>
      Array.from(pixels.slice((y * width + x) * 4, (y * width + x) * 4 + 4));
    expect(point(100, 50)).toEqual([128, 128, 128, 255]);
    expect(point(8, 50)[0]).toBeLessThan(20);
    expect(point(191, 50)[0]).toBeGreaterThan(235);
    expect(point(100, 8)[1]).toBeLessThan(20);
    expect(point(100, 91)[1]).toBeGreaterThan(235);
    expect(point(0, 0)).toEqual([128, 128, 128, 255]);
  });
  it("is deterministic, bounded, and clamps oversized circular radii", () => {
    const pixels = createLensMap(42, 42, 999);
    expect(pixels).toEqual(createLensMap(42, 42, 21));
    expect(pixels.length).toBe(42 * 42 * 4);
    expect(pixels.every((value) => Number.isFinite(value))).toBe(true);
  });
});
