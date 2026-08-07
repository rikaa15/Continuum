import { beforeEach, describe, expect, it } from "vitest";
import { personaA } from "@/lib/demo/personas";
import {
  loadBrowserStore,
  saveProfileToBrowser,
} from "@/lib/profile/browser-store";

class MemoryStorage {
  private values = new Map<string, string>();

  getItem(key: string) {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string) {
    this.values.set(key, value);
  }

  removeItem(key: string) {
    this.values.delete(key);
  }

  clear() {
    this.values.clear();
  }
}

const localStorage = new MemoryStorage();

beforeEach(() => {
  localStorage.clear();
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: { localStorage },
  });
});

describe("browser profile store", () => {
  it("persists a separate active profile across reads", () => {
    const profile = {
      ...personaA,
      userId: "local-test-user",
      displayName: "Local Test",
      profileVersion: 2,
    };
    saveProfileToBrowser(profile);

    const refreshed = loadBrowserStore();
    expect(refreshed.activeUserId).toBe("local-test-user");
    expect(refreshed.profiles["local-test-user"].displayName).toBe("Local Test");
    expect(refreshed.profiles["demo-maya"]).toBeDefined();
  });
});
