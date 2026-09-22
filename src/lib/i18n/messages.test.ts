import { describe, expect, it } from "vitest";

import { dictionaries } from "./messages";

describe("translation dictionaries", () => {
  it("contain the same non-empty keys in every locale", () => {
    const englishKeys = Object.keys(dictionaries.en).sort();
    for (const messages of Object.values(dictionaries)) {
      expect(Object.keys(messages).sort()).toEqual(englishKeys);
      expect(Object.values(messages).every((message) => message.trim())).toBe(
        true,
      );
    }
  });
});
