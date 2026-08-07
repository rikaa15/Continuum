import { describe, expect, it } from "vitest";
import { personaA } from "@/lib/demo/personas";
import { compareProfileFreshness } from "@/lib/everos/reconcile";

describe("EverOS profile reconciliation", () => {
  it("prefers the profile with the newer update time", () => {
    const remote = {
      ...personaA,
      updatedAt: "2026-08-08T00:00:00.000Z",
      profileVersion: personaA.profileVersion + 1,
    };
    expect(compareProfileFreshness(personaA, remote)).toBe("remote_newer");
    expect(compareProfileFreshness(remote, personaA)).toBe("local_newer");
  });

  it("uses profile version only when timestamps match", () => {
    const remote = {
      ...personaA,
      profileVersion: personaA.profileVersion + 1,
    };
    expect(compareProfileFreshness(personaA, remote)).toBe("remote_newer");
  });

  it("refuses to reconcile different users", () => {
    expect(() =>
      compareProfileFreshness(personaA, {
        ...personaA,
        userId: "different-user",
      }),
    ).toThrow(/different users/);
  });
});
