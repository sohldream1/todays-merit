import { describe, expect, it } from "vitest";
import { comparePassword, hashPassword } from "./password.js";

describe("hashPassword / comparePassword", () => {
  it("hashes to something other than the plaintext", async () => {
    const hash = await hashPassword("correct horse battery staple");
    expect(hash).not.toBe("correct horse battery staple");
  });

  it("accepts the correct password against its hash", async () => {
    const hash = await hashPassword("correct horse battery staple");
    await expect(comparePassword("correct horse battery staple", hash)).resolves.toBe(true);
  });

  it("rejects an incorrect password against the hash", async () => {
    const hash = await hashPassword("correct horse battery staple");
    await expect(comparePassword("wrong password", hash)).resolves.toBe(false);
  });

  it("salts each hash differently even for the same input", async () => {
    const [a, b] = await Promise.all([hashPassword("same password"), hashPassword("same password")]);
    expect(a).not.toBe(b);
  });
});
