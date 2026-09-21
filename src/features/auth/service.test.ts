import { beforeEach, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
const mocks = vi.hoisted(() => ({
  limit: vi.fn(),
  find: vi.fn(),
  verify: vi.fn(),
}));
vi.mock("@/lib/auth/rate-limit", () => ({ consumeLimit: mocks.limit }));
vi.mock("@/lib/db/client", () => ({
  getDb: () => ({ user: { findFirst: mocks.find } }),
}));
vi.mock("@/lib/auth/password", () => ({
  verifyPassword: mocks.verify,
  hashPassword: vi.fn(),
}));
import { authenticate, register } from "./service";
beforeEach(() => {
  vi.clearAllMocks();
  mocks.limit.mockResolvedValue(true);
  mocks.find.mockResolvedValue(null);
  mocks.verify.mockResolvedValue(false);
});
it("uses the approved login windows and performs a dummy check", async () => {
  expect(
    await authenticate({ email: "Cook@example.test", password: "wrong" }, "ip"),
  ).toBeNull();
  expect(mocks.limit).toHaveBeenCalledWith("login-ip", "ip", 50, 900);
  expect(mocks.limit).toHaveBeenCalledWith(
    "login-email",
    "cook@example.test",
    10,
    900,
  );
  expect(mocks.verify).toHaveBeenCalledWith("wrong", null);
});
it("fails closed when the limiter is unavailable or exhausted", async () => {
  mocks.limit.mockRejectedValue(new Error("unavailable"));
  await expect(
    authenticate({ email: "cook@example.test", password: "wrong" }, "ip"),
  ).rejects.toThrow();
  expect(mocks.find).not.toHaveBeenCalled();
  mocks.limit.mockResolvedValue(false);
  expect(
    await authenticate({ email: "cook@example.test", password: "wrong" }, "ip"),
  ).toBeNull();
  expect(mocks.verify).not.toHaveBeenCalled();
});
it("uses five registrations per hour and denies without writes", async () => {
  mocks.limit.mockResolvedValue(false);
  const result = await register(
    {
      displayName: "Cook",
      username: "cook",
      email: "cook@example.test",
      password: "long cooking password",
      confirmation: "long cooking password",
    },
    "ip",
  );
  expect(result.success).toBe(false);
  expect(mocks.limit).toHaveBeenCalledWith("signup-ip", "ip", 5, 3600);
});
