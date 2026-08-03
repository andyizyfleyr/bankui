"use client";

import { motion } from "framer-motion";
import type { Transaction } from "@/lib/types";
import { cn, formatEUR, timeLabel } from "@/lib/format";
import { txVisual } from "./tx-icon";

export function TransactionItem({
  tx,
  index = 0,
  hidden = false,
}: {
  tx: Transaction;
  index?: number;
  hidden?: boolean;
}) {
  const { icon: Icon, cls } = txVisual(tx);
  const positive = tx.amountCents > 0;

  return (
    <motion.li
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.045, 0.4), duration: 0.35, ease: "easeOut" }}
      className="flex items-center gap-3 px-2.5 py-3"
    >
      <div className={cn("grid h-[42px] w-[42px] shrink-0 place-items-center rounded-[14px] border", cls)}>
        <Icon className="h-[18px] w-[18px]" strokeWidth={2} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium text-ink">{tx.label}</div>
        <div className="mt-[3px] text-xs text-mut">
          {tx.category} · {timeLabel(tx.createdAt)}
        </div>
      </div>
      <div className={cn("font-display text-sm font-semibold tabular-nums", positive ? "text-mint" : "text-ink")}>
        {hidden ? "•• ••" : `${positive ? "+" : ""}${formatEUR(tx.amountCents)}`}
      </div>
    </motion.li>
  );
}
