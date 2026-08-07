import Link from "next/link";
import {
  Bell,
  ChartNoAxesCombined,
  Compass,
  FileUser,
  Leaf,
  UserRound,
} from "lucide-react";
import { switchPersona } from "@/app/actions";
import { personaA, personaB } from "@/lib/demo/personas";
import { getActiveUserId } from "@/lib/profile/service";

const links = [
  { href: "/runway", label: "My Runway", icon: Compass },
  { href: "/alerts/stem-opt-employer-check-2026", label: "Alerts", icon: Bell },
  { href: "/profile", label: "Profile", icon: UserRound },
  { href: "/economics", label: "Judge view", icon: ChartNoAxesCombined },
];

export async function AppShell({ children }: { children: React.ReactNode }) {
  const activeUserId = await getActiveUserId();

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
            Demo persona
          </div>
          <form action={switchPersona}>
            <select
              name="userId"
              defaultValue={activeUserId}
              className="w-full rounded-xl border border-white/15 bg-white/10 px-3 py-2.5 text-sm text-white"
              aria-label="Switch demo persona"
            >
              <option className="text-slate-900" value={personaA.userId}>
                Maya · STEM OPT
              </option>
              <option className="text-slate-900" value={personaB.userId}>
                Daniel · H-1B
              </option>
            </select>
            <button className="mt-2 w-full rounded-xl bg-white/12 px-3 py-2 text-xs font-semibold hover:bg-white/20">
              Switch profile
            </button>
          </form>
          <p className="mt-3 text-[11px] leading-4 text-emerald-100/50">
            Synthetic profiles for demonstration only.
          </p>
        </div>
      </aside>
      <main className="min-w-0">{children}</main>
    </div>
  );
}
