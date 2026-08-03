"use client";

import { motion } from "framer-motion";
import { Delete } from "lucide-react";
import { cn } from "@/lib/format";

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "del"];

/** Pavé numérique néobanque : les chiffres s'accumulent en centimes. */
export function AmountKeypad({
  digits,
  onChange,
  compact = false,
}: {
  digits: string;
  onChange: (next: string) => void;
  compact?: boolean;
}) {
  const press = (key: string) => {
    if (!key) return;
    try {
      navigator.vibrate?.(6);
    } catch {}
    if (key === "del") {
      onChange(digits.slice(0, -1));
      return;
    }
    if (digits.length >= 9) return;
    if (!digits && key === "0") return;
    onChange(digits + key);
  };

  return (
    <div className={cn("grid grid-cols-3", compact ? "gap-1.5" : "gap-2")}>
      {KEYS.map((key, i) =>
        key === "" ? (
          <div key={`spacer-${i}`} />
        ) : (
          <motion.button
            key={key === "del" ? "del" : key}
            type="button"
            whileTap={{ scale: 0.86, backgroundColor: "rgba(11,15,20,0.1)" }}
            onClick={() => press(key)}
            aria-label={key === "del" ? "Effacer" : key}
            className={cn(
              "grid place-items-center rounded-2xl bg-ink/[0.05] font-display font-medium text-ink transition-colors",
              compact ? "h-12 text-xl" : "h-[52px] text-2xl"
            )}
          >
            {key === "del" ? <Delete className="h-6 w-6" strokeWidth={2} /> : key}
          </motion.button>
        )
      )}
    </div>
  );
}
