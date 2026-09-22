// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type {
  UploadApiErrorResponse,
  UploadApiOptions,
  UploadApiResponse,
} from "cloudinary";
import { verifyAvatarReceipt } from "@/lib/storage/image-receipt";

const mocks = vi.hoisted(() => ({
  headers: vi.fn(),
  user: vi.fn(),
  limit: vi.fn(),
  update: vi.fn(),
  upload: vi.fn(),
}));
vi.mock("next/headers", () => ({ headers: mocks.headers }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/auth/session", () => ({ getCurrentUser: mocks.user }));
vi.mock("@/lib/auth/rate-limit", () => ({ consumeLimit: mocks.limit }));
vi.mock("./service", () => ({ updateOwnProfile: mocks.update }));
vi.mock("@/lib/storage/cloudinary", () => ({
  getCloudinary: () => ({ uploader: { upload_stream: mocks.upload } }),
}));
import { updateProfileAction, uploadAvatarAction } from "./actions";

afterEach(() => vi.unstubAllEnvs());
beforeEach(() => {
  vi.clearAllMocks();
  mocks.headers.mockResolvedValue(
    new Headers({ origin: "http://localhost:3000", host: "localhost:3000" }),
  );
  mocks.user.mockResolvedValue({
    id: "user",
    role: "USER",
    status: "ACTIVE",
    profile: { username: "old_name" },
  });
  mocks.limit.mockResolvedValue(true);
  mocks.update.mockResolvedValue({
    username: "new_name",
    displayName: "New Name",
    avatarUrl: null,
  });
});

describe("profile action security", () => {
  it("allows an active user to update only through the validated service", async () => {
    expect(
      (await updateProfileAction({ displayName: "New Name" })).success,
    ).toBe(true);
    expect(mocks.update).toHaveBeenCalledWith("user", {
      displayName: "New Name",
    });
  });

  it("fails closed for guests, cross-origin requests and limiter errors", async () => {
    mocks.user.mockResolvedValue(null);
    expect((await updateProfileAction({})).success).toBe(false);
    mocks.user.mockResolvedValue({ id: "user", status: "ACTIVE" });
    mocks.headers.mockResolvedValue(
      new Headers({ origin: "https://attacker.test", host: "localhost:3000" }),
    );
    expect((await updateProfileAction({})).success).toBe(false);
    mocks.headers.mockResolvedValue(
      new Headers({ origin: "http://localhost:3000", host: "localhost:3000" }),
    );
    mocks.limit.mockRejectedValue(new Error("secret provider detail"));
    const result = await updateProfileAction({});
    expect(result.success).toBe(false);
    expect(JSON.stringify(result)).not.toContain("secret");
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it("uploads an avatar into the user folder and returns an avatar-only receipt", async () => {
    vi.stubEnv("AUTH_SECRET", "isolated-avatar-test-secret-at-least-32");
    const url = "https://res.cloudinary.com/test/image/upload/avatar.png";
    mocks.upload.mockImplementation(
      (
        options: UploadApiOptions,
        callback: (
          error?: UploadApiErrorResponse,
          result?: Partial<UploadApiResponse>,
        ) => void,
      ) => ({
        end: () =>
          callback(undefined, {
            secure_url: url,
            public_id: options.public_id,
          }),
      }),
    );
    const form = new FormData();
    form.set(
      "file",
      new File(
        [
          new Uint8Array([
            137,
            80,
            78,
            71,
            13,
            10,
            26,
            10,
            ...new Array<number>(16).fill(0),
          ]),
        ],
        "avatar.png",
        { type: "image/png" },
      ),
    );
    const result = await uploadAvatarAction(form);
    expect(result.success).toBe(true);
    expect(mocks.upload).toHaveBeenCalledWith(
      expect.objectContaining({
        asset_folder: "cookly",
        public_id: expect.stringMatching(/^cookly\/avatars\/user\//),
        overwrite: false,
      }),
      expect.any(Function),
    );
    if (result.success)
      expect(verifyAvatarReceipt(result.receipt, "user").avatarUrl).toBe(url);
  });
});
