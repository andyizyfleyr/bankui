"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Loader2, Plus, X } from "lucide-react";
import type { Account } from "@/lib/types";
import { cn, digitsToCents, formatEUR } from "@/lib/format";
import { useBank } from "./bank-provider";
import { AmountKeypad } from "./amount-keypad";
import { SuccessCheck } from "./success-check";

type Stage = "edit" | "busy" | "done";

const TYPES: { id: Account["type"]; label: string; color: string; hint: string }[] = [
  { id: "courant", label: "Courant", color: "#D7FF3E", hint: "Quotidien" },
  { id: "epargne", label: "Épargne", color: "#8B7CFF", hint: "Objectif" },
  { id: "livret", label: "Livret", color: "#5AD8C2", hint: "Rémunéré" },
];

export function AddAccountSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { addAccount } = useBank();
  const [name, setName] = useState("");
  const [type, setType] = useState<Account["type"]>("courant");
  const [digits, setDigits] = useState("");
  const [stage, setStage] = useState<Stage>("edit");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setName("");
      setType("courant");
      setDigits("");
      setStage("edit");
      setError(null);
    }
  }, [open]);

  const balance = digitsToCents(digits);
  const valid = name.trim().length >= 2 && stage !== "busy";

  const confirm = async () => {
    if (!valid) return;
    setStage("busy");
    setError(null);
    const res = await addAccount(name.trim(), type, balance);
    if (res.ok) {
      setStage("done");
      window.setTimeout(onClose, 1900);
    } else {
      setError(res.error ?? "Erreur inconnue");
      setStage("edit");
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <div className="absolute inset-0 z-50">
          <motion.div
            className="absolute inset-0 bg-ink/45 backdrop-blur-[3px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => stage !== "busy" && onClose()}
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
              if (info.offset.y > 110 || info.velocity.y > 700) onClose();
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
                    <div className="mt-2 font-display text-xl font-semibold text-ink">Compte créé</div>
                    <div className="text-sm text-mut">{name.trim()}</div>
                  </motion.div>
                ) : (
                  <motion.div key="edit" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    <div className="mb-4 flex items-start justify-between">
                      <div>
                        <h2 className="font-display text-lg font-semibold tracking-tight text-ink">Nouveau compte</h2>
                        <p className="mt-0.5 text-xs text-mut">Ouvrez un compte en quelques secondes</p>
                      </div>
                      <button
                        onClick={onClose}
                        aria-label="Fermer"
                        className="grid h-9 w-9 place-items-center rounded-full bg-ink/[0.05] text-mut transition-colors hover:bg-ink/[0.09]"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>

                    <label className="block">
                      <span className="mb-1.5 block text-xs font-bold uppercase tracking-[0.12em] text-mut">Nom du compte</span>
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Ex : Compte commun"
                        className="w-full rounded-2xl border border-line bg-paper/60 py-3.5 pl-4 pr-4 text-base text-ink placeholder:text-faint focus:border-ink/30 focus:outline-none"
                      />
                    </label>

                    <span className="mt-4 block text-xs font-bold uppercase tracking-[0.12em] text-mut">Type</span>
                    <div className="mt-1.5 flex gap-2">
                      {TYPES.map((t) => (
                        <motion.button
                          key={t.id}
                          whileTap={{ scale: 0.94 }}
                          onClick={() => setType(t.id)}
                          className={cn(
                            "flex flex-1 flex-col items-center gap-1 rounded-2xl border p-3 transition-colors",
                            type === t.id ? "border-transparent" : "border-line bg-paper/40"
                          )}
                          style={type === t.id ? { background: `${t.color}26`, border: `1px solid ${t.color}66` } : undefined}
                        >
                          <span
                            className="h-2.5 w-2.5 rounded-full"
                            style={{ background: type === t.id ? t.color : "#9AA3AF" }}
                          />
                          <span className="text-sm font-semibold text-ink">{t.label}</span>
                          <span className="text-[10px] text-mut">{t.hint}</span>
                        </motion.button>
                      ))}
                    </div>

                    <div className="pb-2 pt-4 text-center">
                      <div
                        className={cn(
                          "font-display text-3xl font-semibold tracking-tight tabular-nums",
                          balance > 0 ? "text-ink" : "text-faint"
                        )}
                      >
                        {formatEUR(balance)}
                      </div>
                      <div className="mt-1 text-xs text-mut">Solde initial (facultatif)</div>
                    </div>

                    <AmountKeypad digits={digits} onChange={setDigits} compact />

                    {error && <p className="mt-3 text-center text-xs font-medium text-rose">{error}</p>}

                    <motion.button
                      whileTap={valid ? { scale: 0.97 } : undefined}
                      onClick={confirm}
                      disabled={!valid}
                      className={cn(
                        "mt-4 flex h-14 w-full items-center justify-center gap-2 rounded-2xl font-display text-base font-semibold transition-all",
                        valid
                          ? "bg-ink text-white shadow-[0_16px_32px_-12px_rgba(11,15,20,0.5)]"
                          : "bg-ink/[0.06] text-faint"
                      )}
                    >
                      {stage === "busy" ? (
                        <>
                          <Loader2 className="h-5 w-5 animate-spin" />
                          Création…
                        </>
                      ) : (
                        <>
                          <Plus className="h-5 w-5" strokeWidth={2.4} />
                          Créer le compte
                        </>
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
