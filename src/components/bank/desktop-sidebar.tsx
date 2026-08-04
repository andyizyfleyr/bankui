"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowLeftRight,
  House,
  Landmark,
  LogOut,
  ReceiptText,
  Send,
  SlidersHorizontal,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/format";
import { useBank } from "./bank-provider";
import { ContactAvatar } from "./avatar";
import { NovaLogo } from "./nova-logo";

interface Item {
  href: string;
  label: string;
  icon: LucideIcon;
}

const NAV: Item[] = [
  { href: "/", label: "Accueil", icon: House },
  { href: "/send", label: "Envoyer", icon: Send },
  { href: "/pret", label: "Prêt", icon: Landmark },
  { href: "/retrait", label: "Retrait", icon: Wallet },
  { href: "/activity", label: "Activité", icon: ReceiptText },
];

export function DesktopSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, openTransfer } = useBank();

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
    router.push("/login");
    router.refresh();
  };

  return (
    <aside className="no-scrollbar hidden w-[264px] shrink-0 flex-col overflow-y-auto overscroll-contain border-r border-line bg-white/70 px-4 py-6 backdrop-blur-xl md:flex">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-2">
        <span className="grid h-10 w-10 place-items-center rounded-2xl bg-ink text-lime">
          <NovaLogo size={24} />
        </span>
        <span className="font-display text-xl font-semibold tracking-tight text-ink">Nova</span>
      </div>

      {/* Navigation */}
      <nav className="mt-6 flex flex-1 flex-col gap-1">
        {NAV.map((item) => {
          const Icon = item.icon;
          const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          return (
            <Link key={item.href} href={item.href}>
              <motion.span
                whileTap={{ scale: 0.98 }}
                className={cn(
                  "flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-semibold transition-colors",
                  active ? "bg-ink text-white" : "text-mut hover:bg-ink/[0.05] hover:text-ink"
                )}
              >
                <Icon className="h-[18px] w-[18px]" strokeWidth={2} />
                {item.label}
                {active && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-lime" />}
              </motion.span>
            </Link>
          );
        })}

        <div className="mt-2 border-t border-line pt-2">
          <Link href="/settings">
            <motion.span
              whileTap={{ scale: 0.98 }}
              className={cn(
                "flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-semibold transition-colors",
                pathname.startsWith("/settings") ? "bg-ink text-white" : "text-mut hover:bg-ink/[0.05] hover:text-ink"
              )}
            >
              <SlidersHorizontal className="h-[18px] w-[18px]" strokeWidth={2} />
              Réglages
              {pathname.startsWith("/settings") && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-lime" />}
            </motion.span>
          </Link>
        </div>
      </nav>

      {/* Transfert rapide */}
      <motion.button
        whileTap={{ scale: 0.97 }}
        onClick={openTransfer}
        className="mb-3 flex h-12 items-center justify-center gap-2 rounded-2xl border border-line bg-white font-display text-sm font-semibold text-ink transition-colors hover:bg-ink/[0.04]"
      >
        <ArrowLeftRight className="h-[18px] w-[18px]" strokeWidth={2.3} />
        Transfert entre comptes
      </motion.button>

      {/* Profil — masqué sur /settings où la page affiche déjà l'identité */}
      {!pathname.startsWith("/settings") && (
        <div className="border-t border-line pt-4">
          <div className="flex items-center gap-3 px-1">
            <ContactAvatar name={user?.name ?? "N V"} color="#0D9F6E" size={42} />
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-semibold text-ink">{user?.name ?? "…"}</div>
              <div className="truncate text-[11px] text-mut">{user?.email ?? ""}</div>
            </div>
            <button
              onClick={logout}
              aria-label="Se déconnecter"
              className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-ink/[0.05] text-mut transition-colors hover:bg-rose/10 hover:text-rose"
            >
              <LogOut className="h-4 w-4" strokeWidth={2.2} />
            </button>
          </div>
        </div>
      )}
    </aside>
  );
}
