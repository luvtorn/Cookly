import { expect, it } from "vitest";
import { adminCatalogQuery, adminCatalogWhere } from "./catalog-query";
import { verificationSchema } from "./schema";
it("defaults to all published recipes regardless of origin, visibility or verification", () => {
  expect(adminCatalogWhere(adminCatalogQuery.parse({}), "admin")).toEqual({
    status: "PUBLISHED",
  });
});
it("scopes Studio to owned editorial recipes even when origin is tampered with", () => {
  expect(
    adminCatalogWhere(
      adminCatalogQuery.parse({
        view: "studio",
        origin: "COMMUNITY",
        status: "ALL",
      }),
      "admin",
    ),
  ).toEqual({ authorId: "admin", isEditorial: true });
});
it("combines filters and safely parses malformed URLs", () => {
  expect(
    adminCatalogWhere(
      adminCatalogQuery.parse({
        status: "ARCHIVED",
        verification: "REJECTED",
        visibility: "HIDDEN",
        origin: "COMMUNITY",
      }),
      "admin",
    ),
  ).toMatchObject({
    status: "ARCHIVED",
    verificationStatus: "REJECTED",
    isHidden: true,
    isEditorial: false,
  });
  expect(
    adminCatalogQuery.parse({ page: -1, status: ["DRAFT"] }),
  ).toMatchObject({ page: 1, status: "PUBLISHED" });
});
it.each(["NONE", "PENDING", "REJECTED"])(
  "requires author feedback for %s",
  (targetStatus) => {
    const command = {
      recipeId: "recipe",
      updatedAt: new Date().toISOString(),
      targetStatus,
      note: "private",
    };
    expect(verificationSchema.safeParse(command).success).toBe(false);
    expect(
      verificationSchema.safeParse({ ...command, creatorMessage: "Reason" })
        .success,
    ).toBe(true);
  },
);
