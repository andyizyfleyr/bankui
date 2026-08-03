"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeftRight, House, ReceiptText, Send, SlidersHorizontal, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/format";
import { useBank } from "./bank-provider";

interface Tab {
  href: string;
  label: string;
  icon: LucideIcon;
}

const leftTabs: Tab[] = [
  { href: "/", label: "Accueil", icon: House },
  { href: "/send", label: "Envoyer", icon: Send },
];

const rightTabs: Tab[] = [
  { href: "/activity", label: "Activité", icon: ReceiptText },
  { href: "/settings", label: "Réglages", icon: SlidersHorizontal },
];

function NavTab({ tab, active }: { tab: Tab; active: boolean }) {
  const Icon = tab.icon;
  return (
    <Link href={tab.href} className="relative flex-1" aria-label={tab.label}>
      {active && (
        <motion.span
          layoutId="nav-pill"
          className="absolute inset-x-1 inset-y-0 rounded-2xl bg-ink/[0.05]"
          transition={{ type: "spring", stiffness: 480, damping: 36 }}
        />
      )}
      <span className="relative flex flex-col items-center gap-[3px] py-1.5">
        <Icon
          className={cn("h-[22px] w-[22px] transition-colors duration-200", active ? "text-ink" : "text-faint")}
          strokeWidth={active ? 2.3 : 1.9}
        />
        <span className={cn("text-[10px] font-semibold tracking-wide", active ? "text-ink" : "text-faint")}>
          {tab.label}
        </span>
      </span>
    </Link>
  );
}

export function BottomNav() {
  const pathname = usePathname();
  const { openTransfer } = useBank();

  return (
    <nav className="safe-bottom relative z-40 border-t border-line bg-white/90 pt-2 backdrop-blur-xl">
      <div className="relative flex items-start px-3">
        {leftTabs.map((t) => (
          <NavTab key={t.href} tab={t} active={isActive(pathname, t.href)} />
        ))}

        {/* Bouton central — Transfert */}
        <div className="relative flex-1">
          <motion.button
            whileTap={{ scale: 0.84 }}
            onClick={openTransfer}
            aria-label="Transfert entre comptes"
            className="absolute left-1/2 top-0 grid h-14 w-14 -translate-x-1/2 -translate-y-[26px] place-items-center rounded-full border-4 border-paper bg-ink text-lime shadow-[0_16px_32px_-8px_rgba(11,15,20,0.45)]"
          >
            <ArrowLeftRight className="h-6 w-6" strokeWidth={2.4} />
          </motion.button>
        </div>

        {rightTabs.map((t) => (
          <NavTab key={t.href} tab={t} active={isActive(pathname, t.href)} />
        ))}
      </div>
    </nav>
  );
}

function isActive(pathname: string, href: string): boolean {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}
