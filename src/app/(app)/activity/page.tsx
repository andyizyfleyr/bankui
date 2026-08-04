"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ArrowDownLeft, ArrowUpRight, Ghost, PieChart } from "lucide-react";
import type { Transaction } from "@/lib/types";
import { cn, dayLabel, formatEUR } from "@/lib/format";
import { useBank } from "@/components/bank/bank-provider";
import { TransactionItem } from "@/components/bank/transaction-item";

const FILTERS = [
  { id: "all", label: "Tout" },
  { id: "in", label: "Reçus" },
  { id: "out", label: "Envoyés" },
  { id: "pay", label: "Paiements" },
] as const;

const DONUT_COLORS = ["#7C6CF0", "#E8793F", "#0D9F6E", "#2B7DE0", "#98A2B3"];

export default function ActivityPage() {
  const { transactions, hidden } = useBank();
  const [filter, setFilter] = useState<(typeof FILTERS)[number]["id"]>("all");

  const now = new Date();
  const monthTx = transactions.filter((t) => {
    const d = new Date(t.createdAt);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });
  const received = monthTx.filter((t) => t.amountCents > 0).reduce((s, t) => s + t.amountCents, 0);
  const spent = monthTx.filter((t) => t.amountCents < 0).reduce((s, t) => s + Math.abs(t.amountCents), 0);
  const spendCount = monthTx.filter((t) => t.amountCents < 0).length;
  const monthName = now.toLocaleDateString("fr-FR", { month: "long" });

  /* Répartition des dépenses du mois par catégorie (top 4 + autre) */
  const donut = useMemo(() => {
    const byCat = new Map<string, number>();
    for (const t of monthTx) {
      if (t.amountCents >= 0) continue;
      byCat.set(t.category, (byCat.get(t.category) ?? 0) + Math.abs(t.amountCents));
    }
    const sorted = [...byCat.entries()].sort((a, b) => b[1] - a[1]);
    const top = sorted.slice(0, 4);
    const rest = sorted.slice(4).reduce((s, [, v]) => s + v, 0);
    const segs = top.map(([label, value], i) => ({ label, value, color: DONUT_COLORS[i] }));
    if (rest > 0) segs.push({ label: "Autre", value: rest, color: DONUT_COLORS[4] });
    const total = segs.reduce((s, x) => s + x.value, 0);
    return { segs, total };
  }, [monthTx]);

  const filtered = useMemo(
    () =>
      transactions.filter((t) => {
        if (filter === "in") return t.amountCents > 0;
        if (filter === "out") return t.kind === "send" || t.kind === "transfer";
        if (filter === "pay") return t.kind === "payment";
        return true;
      }),
    [transactions, filter]
  );

  const groups = useMemo(() => {
    const map = new Map<string, Transaction[]>();
    for (const t of filtered) {
      const key = dayLabel(t.createdAt);
      const list = map.get(key);
      if (list) list.push(t);
      else map.set(key, [t]);
    }
    return [...map.entries()];
  }, [filtered]);

  return (
    <div className="pb-10 md:mx-auto md:max-w-[1020px] md:px-8 md:pb-16">
      <div className="sticky top-0 z-10 border-b border-line bg-paper/85 px-5 pb-4 pt-6 backdrop-blur-xl md:px-0">
        <h1 className="font-display text-xl font-semibold tracking-tight text-ink">Activité</h1>
        <p className="mt-0.5 text-xs capitalize text-mut">Résumé de {monthName}</p>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <StatCard
            label="Reçus"
            cents={received}
            hidden={hidden}
            icon={<ArrowDownLeft className="h-4 w-4" strokeWidth={2.4} />}
            tone="mint"
          />
          <StatCard
            label="Dépensés"
            cents={spent}
            hidden={hidden}
            icon={<ArrowUpRight className="h-4 w-4" strokeWidth={2.4} />}
            tone="rose"
          />
        </div>

        <div className="no-scrollbar -mx-5 mt-4 flex gap-2 overflow-x-auto px-5 md:mx-0 md:px-0">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={cn(
                "relative shrink-0 rounded-full px-4 py-2 text-xs font-bold transition-colors",
                filter === f.id ? "text-white" : "bg-white text-mut"
              )}
            >
              {filter === f.id && (
                <motion.span
                  layoutId="chip-bg"
                  className="absolute inset-0 rounded-full bg-ink"
                  transition={{ type: "spring", stiffness: 500, damping: 34 }}
                />
              )}
              <span className="relative">{f.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Répartition */}
      {donut.total > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.05 }}
          className="card-shadow mx-5 mt-5 rounded-[28px] bg-white p-5 md:mx-0"
        >
          <div className="flex items-center gap-2">
            <span className="grid h-7 w-7 place-items-center rounded-lg bg-violet/10 text-violet">
              <PieChart className="h-4 w-4" strokeWidth={2.2} />
            </span>
            <h2 className="font-display text-base font-semibold text-ink">Répartition des dépenses</h2>
          </div>

          <div className="mt-4 flex items-center gap-5 md:justify-center md:gap-16">
            <div className="relative shrink-0">
              <svg viewBox="0 0 140 140" className="h-[124px] w-[124px] -rotate-90">
                <circle cx="70" cy="70" r="52" fill="none" stroke="#EEF0F4" strokeWidth="16" />
                {(() => {
                  const R = 52;
                  const C = 2 * Math.PI * R;
                  let offset = 0;
                  return donut.segs.map((s) => {
                    const len = (s.value / donut.total) * C;
                    const el = (
                      <motion.circle
                        key={s.label}
                        cx="70"
                        cy="70"
                        r={R}
                        fill="none"
                        stroke={s.color}
                        strokeWidth="16"
                        strokeDasharray={`${len} ${C - len}`}
                        initial={{ strokeDashoffset: 0 }}
                        animate={{ strokeDashoffset: -offset }}
                        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
                      />
                    );
                    offset += len;
                    return el;
                  });
                })()}
              </svg>
              <div className="absolute inset-0 grid place-items-center text-center">
                <div>
                  <div className="font-display text-sm font-bold tabular-nums text-ink">
                    {hidden ? "••" : spendCount}
                  </div>
                  <div className="text-[10px] font-medium text-faint">dépenses</div>
                </div>
              </div>
            </div>

            <ul className="min-w-0 flex-1 space-y-2 md:max-w-[340px]">
              {donut.segs.map((s) => (
                <li key={s.label} className="flex items-center gap-2">
                  <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: s.color }} />
                  <span className="min-w-0 flex-1 truncate text-xs font-medium text-mut">{s.label}</span>
                  <span className="text-xs font-bold tabular-nums text-ink">
                    {Math.round((s.value / donut.total) * 100)} %
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </motion.div>
      )}

      {/* Historique groupé par jour */}
      <div className="px-5 pt-6 md:px-0 md:pt-8">
        {groups.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <span className="card-shadow grid h-14 w-14 place-items-center rounded-3xl bg-white text-faint">
              <Ghost className="h-6 w-6" />
            </span>
            <p className="text-sm text-mut">Aucune transaction dans cette catégorie</p>
          </div>
        ) : (
          groups.map(([label, items]) => {
            const net = items.reduce((s, t) => s + t.amountCents, 0);
            return (
              <div key={label} className="mb-5">
                <div className="mb-2 flex items-baseline justify-between px-1">
                  <h3 className="text-xs font-bold uppercase tracking-[0.14em] text-mut">{label}</h3>
                  {net !== 0 && (
                    <span
                      className={cn(
                        "text-xs font-bold tabular-nums",
                        net > 0 ? "text-mint" : "text-ink"
                      )}
                    >
                      {hidden ? "•• ••" : `${net > 0 ? "+" : "−"}${formatEUR(Math.abs(net))}`}
                    </span>
                  )}
                </div>
                <div className="card-shadow rounded-[24px] bg-white py-1.5">
                  <ul className="divide-y divide-line/70">
                    {items.map((tx, i) => (
                      <TransactionItem key={tx.id} tx={tx} index={i} hidden={hidden} />
                    ))}
                  </ul>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

function StatCard({
  label,
  cents,
  hidden,
  icon,
  tone,
}: {
  label: string;
  cents: number;
  hidden: boolean;
  icon: React.ReactNode;
  tone: "mint" | "rose";
}) {
  return (
    <div className="card-shadow rounded-3xl bg-white p-4">
      <div className="flex items-center gap-2">
        <span
          className={cn(
            "grid h-7 w-7 place-items-center rounded-lg",
            tone === "mint" ? "bg-mint/10 text-mint" : "bg-rose/10 text-rose"
          )}
        >
          {icon}
        </span>
        <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-mut">{label}</span>
      </div>
      <div className="mt-2.5 font-display text-lg font-semibold tabular-nums text-ink">
        {hidden ? "•• ••" : formatEUR(cents)}
      </div>
    </div>
  );
}
