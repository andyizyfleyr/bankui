"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowLeftRight,
  ArrowRight,
  Bell,
  Eye,
  EyeOff,
  Landmark,
  Plus,
  Send,
  TrendingDown,
  TrendingUp,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import type { Account } from "@/lib/types";
import { cn, firstName, formatEUR } from "@/lib/format";
import { useBank } from "@/components/bank/bank-provider";
import { AddAccountSheet } from "@/components/bank/add-account-sheet";
import { AnimatedMoney, MoneyText } from "@/components/bank/amount";
import { ContactAvatar } from "@/components/bank/avatar";
import { TransactionItem } from "@/components/bank/transaction-item";

const GOALS: Partial<Record<Account["type"], { target: number; label: string }>> = {
  epargne: { target: 1_500_000, label: "Objectif 15 000 €" },
  livret: { target: 800_000, label: "Objectif 8 000 €" },
};

const fadeUp = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
};

export default function HomePage() {
  const router = useRouter();
  const { user, accounts, transactions, hidden, toggleHidden, openTransfer } = useBank();
  const [addOpen, setAddOpen] = useState(false);

  const total = accounts.reduce((sum, a) => sum + a.balanceCents, 0);
  const hour = new Date().getHours();
  const greeting = hour >= 18 || hour < 6 ? "Bonsoir" : "Bonjour";
  const dateLabel = new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });

  /* Dépenses des 7 derniers jours, calculées sur les vraies transactions */
  const week = useMemo(() => {
    const labels = ["dim.", "lun.", "mar.", "mer.", "jeu.", "ven.", "sam."];
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toDateString();
      const value = transactions
        .filter((t) => t.amountCents < 0 && new Date(t.createdAt).toDateString() === key)
        .reduce((s, t) => s + Math.abs(t.amountCents), 0);
      days.push({ label: labels[d.getDay()], value, today: i === 0 });
    }
    return days;
  }, [transactions]);

  const weekTotal = week.reduce((s, d) => s + d.value, 0);
  const weekMax = Math.max(...week.map((d) => d.value), 1);

  /* Tendance des dépenses : ce mois vs mois précédent, sur les vraies données */
  const trend = useMemo(() => {
    const now = new Date();
    const curStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const prevStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const spent = (from: Date, to: Date) =>
      transactions
        .filter((t) => {
          if (t.amountCents >= 0) return false;
          const d = new Date(t.createdAt);
          return d >= from && d < to;
        })
        .reduce((s, t) => s + Math.abs(t.amountCents), 0);
    const cur = spent(curStart, new Date(now.getFullYear(), now.getMonth() + 1, 1));
    const prev = spent(prevStart, curStart);
    if (prev <= 0) return null;
    const delta = ((cur - prev) / prev) * 100;
    return { delta: Math.abs(delta), up: delta > 0, flat: Math.abs(delta) < 0.5 };
  }, [transactions]);

  /* Activité récente (aujourd'hui) pour la pastille de notification */
  const hasNews = useMemo(() => {
    const today = new Date().toDateString();
    return transactions.some((t) => new Date(t.createdAt).toDateString() === today);
  }, [transactions]);

  const actions: { label: string; icon: LucideIcon; onClick: () => void }[] = [
    { label: "Envoyer", icon: Send, onClick: () => router.push("/send") },
    { label: "Transfert", icon: ArrowLeftRight, onClick: openTransfer },
    { label: "Prêt", icon: Landmark, onClick: () => router.push("/pret") },
    { label: "Retrait", icon: Wallet, onClick: () => router.push("/retrait") },
  ];

  return (
    <div className="px-5 pb-10 pt-0 md:mx-auto md:max-w-[1120px] md:px-8 md:pb-16 md:pt-8">
      {/* En-tête — masqué sur mobile */}
      <motion.div {...fadeUp} transition={{ duration: 0.4 }} className="hidden items-center justify-between md:flex">
        <div className="flex items-center gap-3">
          <ContactAvatar name={user?.name ?? "N V"} color="#0D9F6E" size={44} />
          <div>
            <div className="text-xs capitalize text-mut">{dateLabel}</div>
            <div className="font-display text-lg font-semibold leading-tight text-ink">
              {greeting}, {firstName(user?.name ?? "Nova")}
            </div>
          </div>
        </div>
        <motion.button
          whileTap={{ scale: 0.88 }}
          onClick={() => router.push("/activity")}
          aria-label="Activité récente"
          className="card-shadow relative grid h-11 w-11 place-items-center rounded-2xl bg-white text-ink"
        >
          <Bell className="h-5 w-5" strokeWidth={1.9} />
          {hasNews && <span className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full bg-rose ring-2 ring-white" />}
        </motion.button>
      </motion.div>

      {/* Carte solde */}
      <div className="md:mt-6 md:grid md:grid-cols-12 md:gap-6">
      <motion.div
        {...fadeUp}
        transition={{ duration: 0.45, delay: 0.06 }}
        className="card-shadow relative -mx-5 mt-0 overflow-hidden rounded-t-none rounded-b-[28px] bg-ink p-5 [--spark-start:#98a2b3] [--spark-end:#ffffff] md:col-span-8 md:mx-0 md:mt-0 md:rounded-[28px] md:bg-white md:[--spark-end:#0b0f14]"
      >
        <div className="pointer-events-none absolute -right-10 -top-14 h-40 w-40 rounded-full bg-lime/30 blur-3xl md:bg-lime/40" />
        <div className="pointer-events-none absolute -bottom-20 -left-8 h-36 w-36 rounded-full bg-violet/25 blur-3xl md:bg-violet/15" />

        <div className="relative flex items-center justify-between">
          <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/50 md:text-mut">
            Solde total
          </span>
          <motion.button
            whileTap={{ scale: 0.85 }}
            onClick={toggleHidden}
            aria-label={hidden ? "Afficher le solde" : "Masquer le solde"}
            className="grid h-8 w-8 place-items-center rounded-full bg-white/10 text-white/60 transition-colors hover:text-white md:bg-ink/[0.05] md:text-mut md:hover:text-ink"
          >
            {hidden ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </motion.button>
        </div>

        <AnimatedMoney
          cents={total}
          hidden={hidden}
          className="relative mt-1.5 block font-display text-[42px] font-semibold leading-none tracking-tight text-white md:text-ink"
        />

        <div className="relative mt-4 flex items-center justify-between">
          {trend ? (
            <span
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold",
                trend.up
                  ? "bg-white/10 text-rose md:bg-rose/10 md:text-rose"
                  : "bg-white/10 text-lime md:bg-mint/10 md:text-mint"
              )}
            >
              {trend.up ? (
                <TrendingUp className="h-3.5 w-3.5" />
              ) : (
                <TrendingDown className="h-3.5 w-3.5" />
              )}
              {trend.flat ? "Stable ce mois" : `${trend.delta.toFixed(1).replace(".", ",")} % ce mois`}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-bold text-white/70 md:bg-ink/[0.05] md:text-mut">
              <TrendingUp className="h-3.5 w-3.5" />
              Premiers relevés
            </span>
          )}
          <svg width="92" height="30" viewBox="0 0 96 32" fill="none" aria-hidden>
            <defs>
              <linearGradient id="spark" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0" style={{ stopColor: "var(--spark-start)" }} stopOpacity="0.5" />
                <stop offset="1" style={{ stopColor: "var(--spark-end)" }} />
              </linearGradient>
            </defs>
            <path
              d="M0 26 C 10 24 14 18 24 20 C 34 22 38 10 50 12 C 62 14 66 20 78 10 C 86 4 90 6 96 3"
              stroke="url(#spark)"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        </div>
      </motion.div>

      {/* Actions rapides */}
      <motion.div {...fadeUp} transition={{ duration: 0.45, delay: 0.12 }} className="mt-6 flex justify-between px-1 md:col-span-4 md:mt-0 md:grid md:grid-cols-2 md:content-start md:gap-2 md:px-0">
        {actions.map((action) => {
          const Icon = action.icon;
          return (
            <button
              key={action.label}
              onClick={action.onClick}
              className="flex w-[68px] flex-col items-center gap-2 md:w-auto md:min-h-[92px] md:justify-center md:rounded-2xl md:border md:border-line md:bg-white md:py-2 md:transition-colors md:hover:bg-ink/[0.04]"
            >
              <motion.span
                whileTap={{ scale: 0.88 }}
                className="card-shadow grid h-14 w-14 place-items-center rounded-full bg-white text-ink"
              >
                <Icon className="h-[22px] w-[22px]" strokeWidth={2} />
              </motion.span>
              <span className="text-xs font-medium text-mut md:text-sm md:font-semibold md:text-ink">{action.label}</span>
            </button>
          );
        })}
      </motion.div>

      {/* Dépenses de la semaine */}
      <motion.div
        {...fadeUp}
        transition={{ duration: 0.45, delay: 0.18 }}
        className="card-shadow mt-7 rounded-[28px] bg-white p-5 md:col-span-4 md:mt-0"
      >
        <div className="flex items-baseline justify-between">
          <h2 className="font-display text-base font-semibold text-ink">Cette semaine</h2>
          <div className="text-right">
            <div className="font-display text-sm font-semibold tabular-nums text-ink">
              {hidden ? "•• ••" : formatEUR(weekTotal)}
            </div>
            <div className="text-[11px] text-mut">dépensés</div>
          </div>
        </div>
        <div className="mt-4 flex h-[104px] items-end gap-[10px]">
          {week.map((d, i) => (
            <div key={i} className="flex flex-1 flex-col items-center gap-1.5">
              <motion.div
                initial={{ height: 0 }}
                animate={{ height: `${Math.max(10, (d.value / weekMax) * 76)}` }}
                transition={{ duration: 0.6, delay: 0.25 + i * 0.05, ease: [0.22, 1, 0.36, 1] }}
                className={cn("w-full rounded-full", d.today ? "bg-ink" : "bg-ink/[0.08]")}
              />
              <span className={cn("text-[10px] font-medium capitalize", d.today ? "font-bold text-ink" : "text-faint")}>
                {d.label}
              </span>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Mes comptes */}
      <motion.div {...fadeUp} transition={{ duration: 0.45, delay: 0.24 }} className="mt-8 md:col-span-8 md:mt-0">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-base font-semibold text-ink">Mes comptes</h2>
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-mut">{accounts.length} comptes</span>
            <motion.button
              whileTap={{ scale: 0.85 }}
              onClick={() => setAddOpen(true)}
              aria-label="Ajouter un compte"
              className="grid h-9 w-9 place-items-center rounded-full bg-ink text-white shadow-[0_8px_16px_-6px_rgba(11,15,20,0.4)]"
            >
              <Plus className="h-[18px] w-[18px]" strokeWidth={2.5} />
            </motion.button>
          </div>
        </div>
        <div className="no-scrollbar -mx-5 flex snap-x snap-mandatory gap-3 overflow-x-auto px-5 pb-4 md:mx-0 md:grid md:grid-cols-2 md:overflow-visible md:px-0 md:pb-0">
          {accounts.map((account) => (
            <AccountCard key={account.id} account={account} hidden={hidden} />
          ))}
        </div>
        <AddAccountSheet open={addOpen} onClose={() => setAddOpen(false)} />
      </motion.div>

      {/* Transactions récentes */}
      <motion.div {...fadeUp} transition={{ duration: 0.45, delay: 0.3 }} className="mt-6 md:col-span-12 md:mt-6">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-base font-semibold text-ink">Transactions récentes</h2>
          <Link href="/activity" className="flex items-center gap-1 text-xs font-bold text-ink">
            Voir tout
            <span className="grid h-5 w-5 place-items-center rounded-full bg-ink text-white">
              <ArrowRight className="h-3 w-3" strokeWidth={2.5} />
            </span>
          </Link>
        </div>
        <div className="card-shadow rounded-[24px] bg-white py-1.5">
          <ul className="divide-y divide-line/70">
            {transactions.slice(0, 6).map((tx, i) => (
              <TransactionItem key={tx.id} tx={tx} index={i} hidden={hidden} />
            ))}
          </ul>
        </div>
      </motion.div>
      </div>
    </div>
  );
}

function AccountCard({ account, hidden }: { account: Account; hidden: boolean }) {
  const goal = GOALS[account.type];
  const progress = goal ? Math.min(1, account.balanceCents / goal.target) : null;

  return (
    <motion.div
      whileTap={{ scale: 0.97 }}
      className="card-shadow relative w-[236px] shrink-0 snap-center overflow-hidden rounded-[24px] bg-white p-4 md:w-auto md:snap-none"
    >
      <div
        className="pointer-events-none absolute -right-9 -top-9 h-24 w-24 rounded-full blur-2xl"
        style={{ background: `${account.color}55` }}
      />
      <div className="relative flex items-center gap-2">
        <span
          className="grid h-8 w-8 place-items-center rounded-[10px]"
          style={{ background: `${account.color}26`, border: `1px solid ${account.color}4d` }}
        >
          <span className="h-2 w-2 rounded-full" style={{ background: account.color }} />
        </span>
        <span className="text-xs font-semibold text-ink">{account.name}</span>
        <span className="ml-auto text-[11px] font-semibold tracking-[0.14em] text-faint">·· {account.last4}</span>
      </div>

      <MoneyText
        cents={account.balanceCents}
        hidden={hidden}
        className="relative mt-4 block font-display text-[24px] font-semibold tracking-tight tabular-nums text-ink"
      />

      {progress !== null ? (
        <div className="relative mt-3">
          <div className="h-1.5 overflow-hidden rounded-full bg-ink/[0.07]">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progress * 100}%` }}
              transition={{ duration: 0.9, delay: 0.4, ease: [0.22, 1, 0.36, 1] }}
              className="h-full rounded-full"
              style={{ background: account.color }}
            />
          </div>
          <div className="mt-1.5 flex items-center justify-between text-[11px] text-mut">
            <span>{goal!.label}</span>
            <span className="font-bold text-ink">{Math.round(progress * 100)} %</span>
          </div>
        </div>
      ) : (
        <div className="relative mt-3 flex items-center justify-between">
          <span className="text-[11px] font-medium tracking-wider text-mut">FR76 ···· {account.last4}</span>
          <span className="rounded-full bg-lime/60 px-2 py-[3px] text-[10px] font-bold uppercase tracking-wider text-ink">
            Principal
          </span>
        </div>
      )}
    </motion.div>
  );
}
