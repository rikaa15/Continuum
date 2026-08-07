import { beforeEach, describe, expect, it } from "vitest";
import { personaA } from "@/lib/demo/personas";
import {
  deleteProfileFromBrowser,
  loadBrowserStore,
  saveProfileToBrowser,
  signOutBrowserSession,
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

  it("deletes local profiles but refuses demo ones", () => {
    saveProfileToBrowser({
      ...personaA,
      userId: "local-delete-me",
      displayName: "Delete Me",
      profileVersion: 1,
    });

    expect(() => deleteProfileFromBrowser("demo-maya")).toThrow(
      /Demo profiles cannot be deleted/,
    );

    const afterDelete = deleteProfileFromBrowser("local-delete-me");
    expect(afterDelete.profiles["local-delete-me"]).toBeUndefined();
    expect(afterDelete.activeUserId).toBe("demo-maya");
  });

  it("clears the active session on sign out", () => {
    saveProfileToBrowser({
      ...personaA,
      userId: "local-session",
      displayName: "Session User",
      profileVersion: 1,
    });
    signOutBrowserSession();

    const refreshed = loadBrowserStore();
    expect(refreshed.activeUserId).toBe("demo-maya");
    expect(refreshed.profiles["local-session"]).toBeDefined();
  });

  it("migrates profiles created before history identity fields existed", () => {
    const legacy = structuredClone(personaA) as Record<string, unknown>;
    delete legacy.citizenshipCountries;
    delete legacy.dateOfBirth;
    delete legacy.countryOfBirth;
    delete legacy.cityOfBirth;
    delete legacy.maritalStatus;
    delete legacy.dependentCount;
    delete legacy.historyReview;
    legacy.historyEvents = [
      {
        id: "legacy-event",
        type: "status",
        title: "Legacy status event",
        date: "2024-01-01",
        confidence: "confirmed",
      },
    ];
    localStorage.setItem(
      "continuum.profiles",
      JSON.stringify({ "legacy-user": { ...legacy, userId: "legacy-user" } }),
    );
    localStorage.setItem("continuum.activeUserId", "legacy-user");

    const migrated = loadBrowserStore().profiles["legacy-user"];
    expect(migrated.citizenshipCountries.state).toBe("unknown");
    expect(migrated.documents).toEqual([]);
    expect(migrated.historyReview.currentSituation).toBe("reviewed");
    expect(migrated.historyEvents[0]).toMatchObject({
      source: "user",
      reviewState: "confirmed",
      datePrecision: "exact",
    });
  });
});
