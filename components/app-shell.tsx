"use client";

import Link from "next/link";
import {
  Bell,
  ChartNoAxesCombined,
  Compass,
  FileUser,
  Leaf,
  LogOut,
  UserRound,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { personaA, personaB } from "@/lib/demo/personas";
import type { ImmigrationProfile } from "@/lib/domain/profile";
import { isDemoUserId } from "@/lib/profile/browser-store";
import { useProfile } from "@/components/profile-provider";

const links = [
  { href: "/runway", label: "My Runway", icon: Compass },
  { href: "/alerts", label: "Alerts", icon: Bell },
  { href: "/profile", label: "Profile", icon: UserRound },
  { href: "/economics", label: "Judge view", icon: ChartNoAxesCombined },
];

function profileLabel(profile: ImmigrationProfile) {
  const firstName = profile.displayName.split(" ")[0];
  if (profile.userId === personaA.userId) {
    return `${firstName} · STEM OPT (demo)`;
  }
  if (profile.userId === personaB.userId) {
    return `${firstName} · H-1B (demo)`;
  }
  return `${profile.displayName} · local`;
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { ready, activeUserId, profiles, switchUser, signOut } = useProfile();

  const options = [
    profiles[personaA.userId] ?? personaA,
    profiles[personaB.userId] ?? personaB,
    ...Object.values(profiles).filter(
      (profile) => !isDemoUserId(profile.userId),
    ),
  ];

  return (
    <div className="min-h-screen bg-background lg:grid lg:grid-cols-[250px_1fr]">
      <aside className="border-r bg-[#143b33] px-5 py-6 text-white lg:sticky lg:top-0 lg:flex lg:h-screen lg:flex-col">
        <Link href="/" className="flex items-center gap-3 text-lg font-semibold">
          <span className="grid size-9 place-items-center rounded-xl bg-white/12">
            <Leaf className="size-5" />
          </span>
          Continuum
        </Link>
        <p className="mt-2 pl-12 text-xs text-emerald-100/65">
          Your immigration runway
        </p>

        <nav className="mt-10 grid grid-cols-2 gap-2 lg:grid-cols-1">
          {links.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-emerald-50/75 hover:bg-white/10 hover:text-white"
            >
              <Icon className="size-4" />
              {label}
            </Link>
          ))}
        </nav>

        <div className="mt-6 border-t border-white/10 pt-6 lg:mt-auto">
          <div className="mb-2 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-100/55">
            <FileUser className="size-3.5" />
            Profile
          </div>
          <select
            value={ready ? activeUserId : personaA.userId}
            onChange={(event) => {
              switchUser(event.target.value);
              router.push("/runway");
              router.refresh();
            }}
            className="w-full rounded-xl border border-white/15 bg-white/10 px-3 py-2.5 text-sm text-white"
            aria-label="Switch profile"
          >
            {options.map((profile) => (
              <option
                className="text-slate-900"
                key={profile.userId}
                value={profile.userId}
              >
                {profileLabel(profile)}
              </option>
            ))}
          </select>

          <button
            type="button"
            className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-white/15 px-3 py-2 text-xs font-semibold text-emerald-50/85 hover:bg-white/10"
            onClick={() => {
              signOut();
              router.push("/");
              router.refresh();
            }}
          >
            <LogOut className="size-3.5" />
            Sign out
          </button>
          <p className="mt-3 text-[11px] leading-4 text-emerald-100/50">
            Switch profiles anytime. Delete yours from the Profile tab.
          </p>
        </div>
      </aside>
      <main className="min-w-0">{children}</main>
    </div>
  );
}
