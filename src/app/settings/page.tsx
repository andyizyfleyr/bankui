"use client";

import { useEffect, useState, type ReactNode } from "react";
import { motion } from "framer-motion";
import {
  ArrowRight,
  BadgeCheck,
  BellRing,
  ChevronRight,
  FileText,
  Fingerprint,
  Gift,
  KeyRound,
  Languages,
  LifeBuoy,
  LockKeyhole,
  LogOut,
  MessageCircle,
  Moon,
  ShieldCheck,
  Sun,
  UserRound,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/format";
import { useBank } from "@/components/bank/bank-provider";
import { ContactAvatar } from "@/components/bank/avatar";

interface Prefs {
  faceId: boolean;
  online: boolean;
  notif: boolean;
}

const DEFAULT_PREFS: Prefs = { faceId: true, online: true, notif: true };

export default function SettingsPage() {
  const { user, accounts, transactions } = useBank();
  const [prefs, setPrefs] = useState<Prefs>(DEFAULT_PREFS);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("nova:prefs");
      if (raw) setPrefs({ ...DEFAULT_PREFS, ...JSON.parse(raw) });
    } catch {}
  }, []);

  const update = (key: keyof Prefs, value: boolean) => {
    setPrefs((p) => {
      const next = { ...p, [key]: value };
      try {
        localStorage.setItem("nova:prefs", JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  return (
    <div className="px-5 pb-12 pt-6">
      <h1 className="font-display text-xl font-semibold tracking-tight text-ink">Réglages</h1>

      {/* Profil */}
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="card-shadow mt-5 rounded-[28px] bg-white p-4"
      >
        <div className="flex items-center gap-4">
          <ContactAvatar name={user?.name ?? "N V"} color="#0D9F6E" size={58} />
          <div className="min-w-0 flex-1">
            <div className="truncate font-display text-base font-semibold text-ink">{user?.name ?? "…"}</div>
            <div className="truncate text-xs text-mut">{user?.email ?? ""}</div>
            <span className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-ink px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-lime">
              <BadgeCheck className="h-3 w-3" />
              Premium
            </span>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-3 divide-x divide-line rounded-2xl bg-paper/70 py-3 text-center">
          <MiniStat value={String(accounts.length)} label="Comptes" />
          <MiniStat value={String(transactions.length)} label="Opérations" />
          <MiniStat value="2024" label="Membre" />
        </div>
      </motion.div>

      {/* Carte parrainage */}
      <motion.button
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.05 }}
        whileTap={{ scale: 0.98 }}
        className="relative mt-4 block w-full overflow-hidden rounded-[28px] bg-ink p-5 text-left"
      >
        <div className="pointer-events-none absolute -right-8 -top-12 h-36 w-36 rounded-full bg-lime/25 blur-2xl" />
        <div className="relative flex items-center gap-4">
          <span className="grid h-11 w-11 place-items-center rounded-2xl bg-lime text-ink">
            <Gift className="h-5 w-5" strokeWidth={2.2} />
          </span>
          <div className="min-w-0 flex-1">
            <div className="font-display text-sm font-semibold text-white">Parrainez un ami</div>
            <div className="text-xs text-white/60">10 € offerts pour vous deux, instantanément</div>
          </div>
          <span className="grid h-8 w-8 place-items-center rounded-full bg-white/10 text-lime">
            <ArrowRight className="h-4 w-4" strokeWidth={2.4} />
          </span>
        </div>
      </motion.button>

      <Section title="Sécurité" delay={0.1}>
        <Row
          icon={Fingerprint}
          label="Face ID"
          sub="Déverrouillage et paiements"
          control={<Toggle on={prefs.faceId} onChange={(v) => update("faceId", v)} />}
        />
        <Row
          icon={ShieldCheck}
          label="Paiements en ligne"
          sub="Autoriser les achats sur internet"
          control={<Toggle on={prefs.online} onChange={(v) => update("online", v)} />}
        />
        <Row icon={KeyRound} label="Changer le code PIN" sub="Modifié il y a 3 mois" chevron />
      </Section>

      <Section title="Préférences" delay={0.14}>
        <Row
          icon={BellRing}
          label="Notifications"
          sub="Alertes de paiement instantanées"
          control={<Toggle on={prefs.notif} onChange={(v) => update("notif", v)} />}
        />
        <Row icon={Sun} label="Apparence" value="Clair" chevron />
        <Row icon={Languages} label="Langue" value="Français" chevron />
      </Section>

      <Section title="Compte" delay={0.18}>
        <Row icon={UserRound} label="Informations personnelles" chevron />
        <Row icon={FileText} label="Relevés et documents" badge="Bientôt" />
      </Section>

      <Section title="Aide" delay={0.22}>
        <Row icon={LifeBuoy} label="Centre d'aide" chevron />
        <Row icon={MessageCircle} label="Nous contacter" sub="Réponse en ~2 min" chevron />
        <Row icon={LockKeyhole} label="Confidentialité" chevron />
      </Section>

      <motion.button
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.26 }}
        whileTap={{ scale: 0.97 }}
        className="mt-6 flex h-[52px] w-full items-center justify-center gap-2 rounded-2xl bg-rose/10 font-display text-sm font-semibold text-rose"
      >
        <LogOut className="h-4 w-4" strokeWidth={2.2} />
        Se déconnecter
      </motion.button>

      <p className="mt-6 flex items-center justify-center gap-1.5 text-center text-[11px] text-faint">
        <Moon className="h-3 w-3" />
        Nova Bank · v2.0 — Conçu avec soin à Paris
      </p>
    </div>
  );
}

function MiniStat({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <div className="font-display text-base font-bold text-ink">{value}</div>
      <div className="mt-0.5 text-[10px] font-semibold uppercase tracking-wider text-faint">{label}</div>
    </div>
  );
}

function Section({ title, children, delay = 0 }: { title: string; children: ReactNode; delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      className="mt-6"
    >
      <h2 className="mb-2 px-1 text-xs font-bold uppercase tracking-[0.16em] text-mut">{title}</h2>
      <div className="card-shadow overflow-hidden rounded-[24px] bg-white p-1.5">{children}</div>
    </motion.div>
  );
}

function Row({
  icon: Icon,
  label,
  sub,
  value,
  badge,
  chevron,
  control,
}: {
  icon: LucideIcon;
  label: string;
  sub?: string;
  value?: string;
  badge?: string;
  chevron?: boolean;
  control?: ReactNode;
}) {
  return (
    <motion.button
      whileTap={control ? undefined : { scale: 0.985 }}
      className="flex w-full items-center gap-3 rounded-[18px] px-2.5 py-3 text-left transition-colors hover:bg-paper/70"
    >
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-ink/[0.05] text-ink">
        <Icon className="h-[18px] w-[18px]" strokeWidth={2} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium text-ink">{label}</span>
        {sub && <span className="block truncate text-xs text-mut">{sub}</span>}
      </span>
      {value && <span className="shrink-0 text-xs font-semibold text-mut">{value}</span>}
      {badge && (
        <span className="shrink-0 rounded-full bg-violet/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-violet">
          {badge}
        </span>
      )}
      {chevron && <ChevronRight className="h-4 w-4 shrink-0 text-faint" />}
      {control}
    </motion.button>
  );
}

function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      role="switch"
      aria-checked={on}
      onClick={(e) => {
        e.stopPropagation();
        onChange(!on);
        try {
          navigator.vibrate?.(8);
        } catch {}
      }}
      className={cn(
        "flex h-[28px] w-[50px] shrink-0 items-center rounded-full px-1 transition-colors duration-200",
        on ? "justify-end bg-ink" : "justify-start bg-ink/[0.12]"
      )}
    >
      <motion.span
        layout
        transition={{ type: "spring", stiffness: 550, damping: 34 }}
        className={cn("h-[20px] w-[20px] rounded-full shadow", on ? "bg-lime" : "bg-white")}
      />
    </button>
  );
}
