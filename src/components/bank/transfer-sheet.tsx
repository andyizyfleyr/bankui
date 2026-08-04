"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowUpDown, Loader2, X } from "lucide-react";
import type { Account } from "@/lib/types";
import { cn, digitsToCents, formatEUR } from "@/lib/format";
import { useBank } from "./bank-provider";
import { AmountKeypad } from "./amount-keypad";
import { SuccessCheck } from "./success-check";

type Stage = "edit" | "busy" | "done";

const PRESETS = [
  { label: "10 %", ratio: 0.1 },
  { label: "25 %", ratio: 0.25 },
  { label: "50 %", ratio: 0.5 },
  { label: "Max", ratio: 1 },
];

export function TransferSheet() {
  const { transferOpen, closeTransfer, accounts, makeTransfer, hidden } = useBank();
  const [digits, setDigits] = useState("");
  const [fromId, setFromId] = useState<string | null>(null);
  const [toId, setToId] = useState<string | null>(null);
  const [stage, setStage] = useState<Stage>("edit");
  const [error, setError] = useState<string | null>(null);
  const [swaps, setSwaps] = useState(0);

  const openKey = transferOpen ? accounts.map((a) => a.id).join("|") : null;
  const [resetKey, setResetKey] = useState<string | null>(openKey);
  if (openKey !== resetKey) {
    setResetKey(openKey);
    if (openKey !== null) {
      const courant = accounts.find((a) => a.type === "courant") ?? accounts[0];
      const other = accounts.find((a) => a.id !== courant.id) ?? accounts[0];
      setFromId(courant.id);
      setToId(other.id);
      setDigits("");
      setStage("edit");
      setError(null);
    }
  }

  useEffect(() => {
    if (!transferOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && stage !== "busy") closeTransfer();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [transferOpen, stage, closeTransfer]);

  const from = accounts.find((a) => a.id === fromId) ?? null;
  const to = accounts.find((a) => a.id === toId) ?? null;
  const cents = digitsToCents(digits);
  const overdrawn = from ? cents > from.balanceCents : false;
  const valid = cents > 0 && from && to && from.id !== to.id && !overdrawn;

  const cycle = (currentId: string | null, otherId: string | null): string | null => {
    if (accounts.length < 2 || !currentId) return currentId;
    const idx = accounts.findIndex((a) => a.id === currentId);
    for (let i = 1; i <= accounts.length; i++) {
      const candidate = accounts[(idx + i) % accounts.length];
      if (candidate.id !== otherId) return candidate.id;
    }
    return currentId;
  };

  const swap = () => {
    setFromId(toId);
    setToId(fromId);
    setSwaps((s) => s + 1);
  };

  const applyPreset = (ratio: number) => {
    if (!from) return;
    const value = Math.floor((from.balanceCents * ratio) / 100);
    setDigits(value > 0 ? String(value) : "");
  };

  const confirm = async () => {
    if (!valid || !from || !to) return;
    setStage("busy");
    setError(null);
    const res = await makeTransfer(from.id, to.id, cents);
    if (res.ok) {
      setStage("done");
      window.setTimeout(() => closeTransfer(), 1900);
    } else {
      setError(res.error ?? "Erreur inconnue");
      setStage("edit");
    }
  };

  return (
    <AnimatePresence>
      {transferOpen && (
        <div className="absolute inset-0 z-50">
          <motion.div
            className="absolute inset-0 bg-ink/45 backdrop-blur-[3px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => stage !== "busy" && closeTransfer()}
          />
          <motion.div
            className="absolute inset-x-0 bottom-0 mx-auto max-h-[94%] w-full max-w-[440px] overflow-hidden rounded-t-[32px] bg-white shadow-[0_-24px_60px_-24px_rgba(16,24,40,0.35)] md:mb-8 md:rounded-[32px] md:shadow-[0_40px_80px_-32px_rgba(16,24,40,0.5)]"
            initial={{ y: "105%" }}
            animate={{ y: 0 }}
            exit={{ y: "105%" }}
            transition={{ type: "spring", stiffness: 340, damping: 34 }}
            drag={stage === "busy" ? false : "y"}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.7 }}
            onDragEnd={(_, info) => {
              if (info.offset.y > 110 || info.velocity.y > 700) closeTransfer();
            }}
          >
            <div className="no-scrollbar max-h-[inherit] overflow-y-auto px-5 pb-7 pt-2.5">
              <div className="mx-auto mb-4 h-[5px] w-10 rounded-full bg-ink/[0.12]" />

              <AnimatePresence mode="wait">
                {stage === "done" ? (
                  <motion.div
                    key="done"
                    initial={{ opacity: 0, scale: 0.92 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.3 }}
                    className="flex min-h-[340px] flex-col items-center justify-center gap-3 py-8 text-center"
                  >
                    <SuccessCheck />
                    <div className="mt-2 font-display text-xl font-semibold text-ink">Transfert effectué</div>
                    <div className="font-display text-3xl font-semibold text-mint">{formatEUR(cents)}</div>
                    <div className="text-sm text-mut">
                      De <span className="font-semibold text-ink">{from?.name}</span> vers{" "}
                      <span className="font-semibold text-ink">{to?.name}</span>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div key="edit" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    {/* En-tête */}
                    <div className="mb-4 flex items-start justify-between">
                      <div>
                        <h2 className="font-display text-lg font-semibold tracking-tight text-ink">
                          Transfert interne
                        </h2>
                        <p className="mt-0.5 text-xs text-mut">Entre vos comptes Nova · instantané · 0 € de frais</p>
                      </div>
                      <button
                        onClick={closeTransfer}
                        aria-label="Fermer"
                        className="grid h-9 w-9 place-items-center rounded-full bg-ink/[0.05] text-mut transition-colors hover:bg-ink/[0.09]"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>

                    {/* De / Vers */}
                    <div className="relative">
                      <AccountRow
                        label="De"
                        account={from}
                        hidden={hidden}
                        onPress={() => setFromId(cycle(fromId, toId))}
                      />
                      <div className="h-2" />
                      <AccountRow
                        label="Vers"
                        account={to}
                        hidden={hidden}
                        onPress={() => setToId(cycle(toId, fromId))}
                      />
                      <motion.button
                        onClick={swap}
                        animate={{ rotate: swaps * 180 }}
                        transition={{ type: "spring", stiffness: 300, damping: 22 }}
                        whileTap={{ scale: 0.85 }}
                        aria-label="Inverser les comptes"
                        className="absolute right-4 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full border-4 border-white bg-ink text-lime shadow-[0_10px_24px_-6px_rgba(11,15,20,0.4)]"
                      >
                        <ArrowUpDown className="h-4 w-4" strokeWidth={2.5} />
                      </motion.button>
                    </div>

                    {/* Montant */}
                    <div className="pb-2 pt-4 text-center">
                      <div
                        className={cn(
                          "font-display text-4xl font-semibold tracking-tight tabular-nums transition-colors",
                          cents > 0 ? "text-ink" : "text-faint"
                        )}
                      >
                        {formatEUR(cents)}
                      </div>
                      <div className={cn("mt-1.5 text-xs", overdrawn ? "font-medium text-rose" : "text-mut")}>
                        {overdrawn
                          ? "Montant supérieur au solde disponible"
                          : from
                            ? `Disponible : ${hidden ? "•• ••" : formatEUR(from.balanceCents)}`
                            : "Appuyez sur un compte pour le changer"}
                      </div>
                      {/* Pourcentages rapides */}
                      <div className="mt-3 flex justify-center gap-2">
                        {PRESETS.map((p) => (
                          <motion.button
                            key={p.label}
                            whileTap={{ scale: 0.92 }}
                            onClick={() => applyPreset(p.ratio)}
                            className="rounded-full border border-line bg-white px-3.5 py-1.5 text-xs font-bold text-ink transition-colors hover:bg-ink/[0.05]"
                          >
                            {p.label}
                          </motion.button>
                        ))}
                      </div>
                    </div>

                    <AmountKeypad digits={digits} onChange={setDigits} compact />

                    {error && <p className="mt-3 text-center text-xs font-medium text-rose">{error}</p>}

                    <motion.button
                      whileTap={valid ? { scale: 0.97 } : undefined}
                      onClick={confirm}
                      disabled={!valid || stage === "busy"}
                      className={cn(
                        "mt-4 flex h-14 w-full items-center justify-center gap-2 rounded-2xl font-display text-base font-semibold transition-all",
                        valid && stage !== "busy"
                          ? "bg-ink text-white shadow-[0_16px_32px_-12px_rgba(11,15,20,0.5)]"
                          : "bg-ink/[0.06] text-faint"
                      )}
                    >
                      {stage === "busy" ? (
                        <>
                          <Loader2 className="h-5 w-5 animate-spin" />
                          Virement en cours…
                        </>
                      ) : (
                        <>Transférer{cents > 0 ? ` ${formatEUR(cents)}` : ""}</>
                      )}
                    </motion.button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

function AccountRow({
  label,
  account,
  hidden,
  onPress,
}: {
  label: string;
  account: Account | null;
  hidden: boolean;
  onPress: () => void;
}) {
  return (
    <motion.button
      whileTap={{ scale: 0.98 }}
      onClick={onPress}
      className="flex w-full items-center gap-3 rounded-2xl border border-line bg-paper/60 p-3.5 pr-16 text-left transition-colors hover:bg-paper"
    >
      <span
        className="grid h-9 w-9 place-items-center rounded-xl"
        style={{ background: `${account?.color ?? "#888"}1f`, border: `1px solid ${account?.color ?? "#888"}40` }}
      >
        <span className="h-2.5 w-2.5 rounded-full" style={{ background: account?.color ?? "#888" }} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[10px] font-bold uppercase tracking-[0.14em] text-faint">{label}</span>
        <span className="mt-0.5 block truncate text-sm font-semibold text-ink">{account?.name ?? "—"}</span>
      </span>
      <span className="text-xs font-semibold tabular-nums text-mut">
        {account ? (hidden ? "••" : formatEUR(account.balanceCents)) : ""}
      </span>
    </motion.button>
  );
}
