"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { personaA, personaB } from "@/lib/demo/personas";
import type { ImmigrationProfile } from "@/lib/domain/profile";
import { deleteDocumentFile } from "@/lib/profile/document-store";
import {
  deleteProfileFromBrowser,
  isDemoUserId,
  loadBrowserStore,
  markEverosSynced,
  saveProfileToBrowser,
  setActiveUserId as persistActiveUserId,
  signOutBrowserSession,
  type BrowserStoreSnapshot,
} from "@/lib/profile/browser-store";

type ProfileContextValue = {
  ready: boolean;
  profile: ImmigrationProfile;
  profiles: Record<string, ImmigrationProfile>;
  activeUserId: string;
  everosSynced: boolean;
  isDemoProfile: boolean;
  switchUser: (userId: string) => void;
  saveProfile: (
    profile: ImmigrationProfile,
    options?: { syncEverOS?: boolean },
  ) => Promise<void>;
  deleteProfile: (userId?: string) => Promise<void>;
  signOut: () => void;
  syncStatus: "idle" | "syncing" | "synced" | "error";
};

const ProfileContext = createContext<ProfileContextValue | null>(null);

const emptySnapshot: BrowserStoreSnapshot = {
  activeUserId: personaA.userId,
  profiles: {
    [personaA.userId]: personaA,
    [personaB.userId]: personaB,
  },
  everosSyncedUserIds: [],
};

function subscribe(onStoreChange: () => void) {
  if (typeof window === "undefined") return () => {};
  const handler = () => onStoreChange();
  window.addEventListener("storage", handler);
  window.addEventListener("continuum-profile-change", handler);
  return () => {
    window.removeEventListener("storage", handler);
    window.removeEventListener("continuum-profile-change", handler);
  };
}

function getSnapshot() {
  return loadBrowserStore();
}

function getServerSnapshot() {
  return emptySnapshot;
}

function notifyStoreChange() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("continuum-profile-change"));
  }
}

export function ProfileProvider({ children }: { children: ReactNode }) {
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const [syncStatus, setSyncStatus] = useState<"idle" | "syncing" | "synced" | "error">(
    "idle",
  );
  const ready = typeof window !== "undefined";

  const switchUser = useCallback((userId: string) => {
    persistActiveUserId(userId);
    notifyStoreChange();
  }, []);

  const saveProfile = useCallback(
    async (profile: ImmigrationProfile, options?: { syncEverOS?: boolean }) => {
      const saved = saveProfileToBrowser(profile);
      notifyStoreChange();

      if (options?.syncEverOS === false) return;

      setSyncStatus("syncing");
      void (async () => {
        try {
          const response = await fetch("/api/everos/sync", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ profile: saved }),
          });
          if (!response.ok) throw new Error("EverOS sync failed");
          markEverosSynced(saved.userId);
          notifyStoreChange();
          setSyncStatus("synced");
        } catch {
          setSyncStatus("error");
        }
      })();
    },
    [],
  );

  const deleteProfile = useCallback(
    async (userId?: string) => {
      const target = userId ?? snapshot.activeUserId;
      const documents = snapshot.profiles[target]?.documents ?? [];
      await Promise.allSettled(
        documents.map((document) =>
          deleteDocumentFile(target, document.id),
        ),
      );
      deleteProfileFromBrowser(target);
      notifyStoreChange();
    },
    [snapshot.activeUserId, snapshot.profiles],
  );

  const signOut = useCallback(() => {
    signOutBrowserSession();
    notifyStoreChange();
  }, []);

  const value = useMemo<ProfileContextValue>(() => {
    const profile = snapshot.profiles[snapshot.activeUserId] ?? personaA;
    return {
      ready,
      profile,
      profiles: snapshot.profiles,
      activeUserId: snapshot.activeUserId,
      everosSynced: snapshot.everosSyncedUserIds.includes(profile.userId),
      isDemoProfile: isDemoUserId(profile.userId),
      switchUser,
      saveProfile,
      deleteProfile,
      signOut,
      syncStatus,
    };
  }, [
    snapshot,
    ready,
    switchUser,
    saveProfile,
    deleteProfile,
    signOut,
    syncStatus,
  ]);

  return <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>;
}

export function useProfile() {
  const context = useContext(ProfileContext);
  if (!context) throw new Error("useProfile must be used within ProfileProvider");
  return context;
}
