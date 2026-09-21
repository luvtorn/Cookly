// @vitest-environment node
import { expect, it } from "vitest";
import { hashPassword, verifyPassword } from "./password";
it("salts hashes and verifies only the exact password", async () => {
  const password = " a memorable long password ";
  const first = await hashPassword(password);
  expect(first).not.toBe(await hashPassword(password));
  expect(await verifyPassword(password, first)).toBe(true);
  expect(await verifyPassword(password.trim(), first)).toBe(false);
  expect(await verifyPassword(password, null)).toBe(false);
  expect(await verifyPassword(password, "invalid")).toBe(false);
}, 15000);
