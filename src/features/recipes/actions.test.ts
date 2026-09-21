import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  headers: vi.fn(),
  user: vi.fn(),
  limit: vi.fn(),
  save: vi.fn(),
  upload: vi.fn(),
}));
vi.mock("next/headers", () => ({ headers: mocks.headers }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/auth/session", () => ({ getCurrentUser: mocks.user }));
vi.mock("@/lib/auth/rate-limit", () => ({ consumeLimit: mocks.limit }));
vi.mock("./service", () => ({ saveAdminRecipe: mocks.save }));
vi.mock("@/lib/storage/cloudinary", () => ({
  getCloudinary: () => ({ uploader: { upload_stream: mocks.upload } }),
}));
import { saveRecipeAction, uploadCoverAction } from "./actions";
beforeEach(() => {
  vi.clearAllMocks();
  mocks.headers.mockResolvedValue(
    new Headers({ origin: "http://localhost:3000", host: "localhost:3000" }),
  );
  mocks.user.mockResolvedValue({
    id: "admin",
    role: "ADMIN",
    status: "ACTIVE",
  });
  mocks.limit.mockResolvedValue(true);
});
describe("admin action security", () => {
  it("refuses guests and ordinary users without touching storage or recipes", async () => {
    for (const user of [null, { id: "user", role: "USER" }]) {
      mocks.user.mockResolvedValue(user);
      expect((await saveRecipeAction({})).success).toBe(false);
      expect((await uploadCoverAction(new FormData())).success).toBe(false);
    }
    expect(mocks.save).not.toHaveBeenCalled();
    expect(mocks.upload).not.toHaveBeenCalled();
  });
  it("rejects absent and cross-origin requests", async () => {
    for (const h of [
      new Headers({ host: "localhost:3000" }),
      new Headers({ origin: "https://attacker.test", host: "localhost:3000" }),
    ]) {
      mocks.headers.mockResolvedValue(h);
      expect((await saveRecipeAction({})).success).toBe(false);
    }
    expect(mocks.save).not.toHaveBeenCalled();
  });
  it("fails closed when the limiter is unavailable without exposing details", async () => {
    mocks.limit.mockRejectedValue(new Error("secret database credentials"));
    const result = await saveRecipeAction({});
    expect(result.success).toBe(false);
    expect(JSON.stringify(result)).not.toContain("secret");
    expect(mocks.save).not.toHaveBeenCalled();
  });
  it("rejects oversized images and non-images without contacting Cloudinary", async () => {
    for (const file of [
      new File([new Uint8Array(3 * 1024 * 1024 + 1)], "large.png", {
        type: "image/png",
      }),
      new File(["<svg>not a photograph</svg>"], "bad.svg", {
        type: "image/svg+xml",
      }),
    ]) {
      const form = new FormData();
      form.set("file", file);
      expect((await uploadCoverAction(form)).success).toBe(false);
    }
    expect(mocks.upload).not.toHaveBeenCalled();
  });
});
