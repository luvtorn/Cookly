import { expect, it, vi } from "vitest";
vi.mock("next/headers", () => ({ headers: async () => new Headers() }));
vi.mock("@/lib/auth/rate-limit", () => ({ clientAddress: () => "fallback" }));
vi.mock("./service", () => ({
  register: vi
    .fn()
    .mockRejectedValue(new Error("SQL private-password private-host")),
}));
import { registerAction } from "./actions";
it("does not expose storage or provider exceptions", async () => {
  const result = await registerAction({});
  expect(result.success).toBe(false);
  expect(JSON.stringify(result)).not.toMatch(
    /SQL|private-password|private-host/,
  );
});
