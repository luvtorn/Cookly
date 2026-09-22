import { describe, expect, it } from "vitest";

import {
  detectLocale,
  localeFromPathname,
  localizePath,
  stripLocalePrefix,
} from "./config";

describe("i18n routing", () => {
  it("detects a supported cookie before browser preferences", () => {
    expect(detectLocale("pl", "ru-RU,ru;q=0.9")).toBe("pl");
  });

  it("uses weighted browser preferences and falls back to English", () => {
    expect(detectLocale(undefined, "de-DE;q=0.9,ru-RU;q=0.8")).toBe("ru");
    expect(detectLocale(undefined, "de-DE")).toBe("en");
  });

  it("adds and replaces locale prefixes without touching admin or API", () => {
    expect(localizePath("ru", "/recipes?q=pasta#results")).toBe(
      "/ru/recipes?q=pasta#results",
    );
    expect(localizePath("pl", "/en/recipes")).toBe("/pl/recipes");
    expect(localizePath("en", "/")).toBe("/en");
    expect(localizePath("ru", "/admin/recipes")).toBe("/admin/recipes");
    expect(localizePath("ru", "/api/search/recipes")).toBe(
      "/api/search/recipes",
    );
  });

  it("reads and strips only supported locale segments", () => {
    expect(localeFromPathname("/pl/recipes")).toBe("pl");
    expect(stripLocalePrefix("/ru")).toBe("/");
    expect(stripLocalePrefix("/recipes")).toBe("/recipes");
  });
});
