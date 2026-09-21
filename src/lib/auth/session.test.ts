import { beforeEach, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
vi.mock("react", () => ({ cache: (fn: unknown) => fn }));
const mocks = vi.hoisted(() => ({
  find: vi.fn(),
  session: vi.fn(),
  cookies: vi.fn(),
}));
vi.mock("next/headers", () => ({ cookies: mocks.cookies }));
vi.mock("next-auth", () => ({ getServerSession: mocks.session }));
vi.mock("./config", () => ({ getAuthConfig: () => ({}) }));
vi.mock("@/lib/db/client", () => ({
  getDb: () => ({ user: { findUnique: mocks.find } }),
}));
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new Error(`redirect:${url}`);
  },
}));
import { getCurrentUser, requireModerator, requireUser } from "./session";
beforeEach(() => {
  mocks.cookies.mockResolvedValue({
    getAll: () => [{ name: "next-auth.session-token" }],
  });
  mocks.session.mockResolvedValue({ user: { id: "user", role: "ADMIN" } });
  mocks.find.mockResolvedValue({ id: "user", status: "ACTIVE", role: "USER" });
});
it("does not initialize auth for a guest", async () => {
  mocks.session.mockClear();
  mocks.cookies.mockResolvedValue({ getAll: () => [] });
  expect(await getCurrentUser()).toBeNull();
  expect(mocks.session).not.toHaveBeenCalled();
});
it.each(["SUSPENDED", "BANNED"])(
  "rejects a current %s status",
  async (status) => {
    mocks.find.mockResolvedValue({ id: "user", status });
    expect(await getCurrentUser()).toBeNull();
    await expect(requireUser()).rejects.toThrow("redirect:/auth/sign-in");
  },
);
it("rejects deleted users and ignores a stale JWT administrator role", async () => {
  await expect(requireModerator()).rejects.toThrow("Access denied");
  mocks.find.mockResolvedValue(null);
  expect(await getCurrentUser()).toBeNull();
});
