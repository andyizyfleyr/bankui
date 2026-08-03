"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { BadgePercent, CalendarDays, Loader2, Wallet } from "lucide-react";
import { cn, digitsToCents, formatEUR } from "@/lib/format";
import { useBank } from "@/components/bank/bank-provider";
import { AmountKeypad } from "@/components/bank/amount-keypad";
import { SuccessCheck } from "@/components/bank/success-check";

const RATE = 5;
const AMOUNTS = [10_000, 50_000, 100_000, 500_000, 1_000_000];
const TERMS = [12, 24, 36, 48, 60];

const fadeUp = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
};

function monthlyPaymentCents(amountCents: number, termMonths: number): number {
  if (termMonths <= 0) return amountCents;
  const r = RATE / 100 / 12;
  if (r === 0) return Math.ceil(amountCents / termMonths);
  return Math.ceil((amountCents * r) / (1 - Math.pow(1 + r, -termMonths)));
}

export default function LoanPage() {
  const { loans, accounts, requestLoan, hidden } = useBank();
  const [digits, setDigits] = useState("50000");
  const [term, setTerm] = useState(24);
  const [stage, setStage] = useState<"edit" | "busy" | "done">("edit");
  const [error, setError] = useState<string | null>(null);

  const amount = digitsToCents(digits);
  const valid = amount >= 10_000 && amount <= 10_000_000 && stage !== "busy";
  const payment = monthlyPaymentCents(amount, term);
  const total = payment * term;
  const interest = total - amount;
  const target = accounts.find((a) => a.type === "courant") ?? accounts[0];

  const active = useMemo(() => loans.filter((l) => l.status === "active"), [loans]);

  useEffect(() => {
    if (stage === "done") {
      const t = window.setTimeout(() => setStage("edit"), 2200);
      return () => window.clearTimeout(t);
    }
  }, [stage]);

  const confirm = async () => {
    if (!valid) return;
    setStage("busy");
    setError(null);
    const res = await requestLoan(amount, term);
    if (res.ok) setStage("done");
    else {
      setError(res.error ?? "Erreur inconnue");
      setStage("edit");
    }
  };

  return (
    <div className="px-5 pb-10 pt-6">
      <motion.div {...fadeUp} transition={{ duration: 0.4 }}>
        <h1 className="font-display text-xl font-semibold tracking-tight text-ink">Prêt d&apos;argent</h1>
        <p className="mt-0.5 text-sm text-mut">Financez vos projets dès aujourd&apos;hui</p>
      </motion.div>

      {/* Carte offre */}
      <motion.div
        {...fadeUp}
        transition={{ duration: 0.45, delay: 0.05 }}
        className="card-shadow relative mt-5 overflow-hidden rounded-[28px] bg-ink p-5 text-white"
      >
        <div className="pointer-events-none absolute -right-10 -top-14 h-40 w-40 rounded-full bg-lime/30 blur-3xl" />
        <div className="relative flex items-center gap-2.5">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-lime/20 text-lime">
            <Wallet className="h-[18px] w-[18px]" strokeWidth={2.2} />
          </span>
          <div>
            <div className="font-display text-sm font-semibold">Prêt personnel</div>
            <div className="text-[11px] text-white/60">Jusqu&apos;à 10 000 € · sans justificatif</div>
          </div>
        </div>
        <div className="relative mt-4 flex items-end justify-between">
          <span className="font-display text-[30px] font-semibold tracking-tight">10 000 €</span>
          <span className="inline-flex items-center gap-1 rounded-full bg-lime px-2.5 py-1 text-[11px] font-bold text-ink">
            <BadgePercent className="h-3.5 w-3.5" />
            {RATE} % / an
          </span>
        </div>
      </motion.div>

      {/* Sélecteur de montant */}
      <motion.div
        {...fadeUp}
        transition={{ duration: 0.45, delay: 0.1 }}
        className="card-shadow mt-4 rounded-[28px] bg-white p-5"
      >
        <div className="flex items-baseline justify-between">
          <h2 className="font-display text-base font-semibold text-ink">Montant</h2>
          <div className="text-right">
            <div className={cn("font-display text-lg font-semibold tabular-nums", amount > 0 ? "text-ink" : "text-faint")}>
              {hidden ? "•• ••" : formatEUR(amount)}
            </div>
            <div className="text-[11px] text-mut">de 100 € à 10 000 €</div>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {AMOUNTS.map((a) => (
            <motion.button
              key={a}
              whileTap={{ scale: 0.92 }}
              onClick={() => setDigits(String(a))}
              className={cn(
                "rounded-full border px-3.5 py-1.5 text-xs font-bold transition-colors",
                digitsToCents(digits) === a
                  ? "border-transparent bg-ink text-white"
                  : "border-line bg-white text-ink hover:bg-ink/[0.05]"
              )}
            >
              {formatEUR(a)}
            </motion.button>
          ))}
        </div>
        <div className="mt-3">
          <AmountKeypad digits={digits} onChange={setDigits} compact />
        </div>
      </motion.div>

      {/* Durée */}
      <motion.div
        {...fadeUp}
        transition={{ duration: 0.45, delay: 0.15 }}
        className="card-shadow mt-4 rounded-[28px] bg-white p-5"
      >
        <div className="flex items-center justify-between">
          <h2 className="font-display text-base font-semibold text-ink">Durée</h2>
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-mut">
            <CalendarDays className="h-4 w-4" />
            {term} mois
          </span>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {TERMS.map((t) => (
            <motion.button
              key={t}
              whileTap={{ scale: 0.92 }}
              onClick={() => setTerm(t)}
              className={cn(
                "rounded-full border px-3.5 py-1.5 text-xs font-bold transition-colors",
                term === t ? "border-transparent bg-ink text-white" : "border-line bg-white text-ink hover:bg-ink/[0.05]"
              )}
            >
              {t} mois
            </motion.button>
          ))}
        </div>
      </motion.div>

      {/* Récapitulatif */}
      <motion.div
        {...fadeUp}
        transition={{ duration: 0.45, delay: 0.2 }}
        className="card-shadow mt-4 rounded-[28px] bg-white p-5"
      >
        <div className="space-y-2.5 text-sm">
          <Row label="Mensualité" value={hidden ? "•• ••" : `${formatEUR(payment)} / mois`} bold />
          <Row label="Durée" value={`${term} mois`} />
          <Row label="Coût total" value={hidden ? "•• ••" : formatEUR(total)} />
          <Row label="Intérêts" value={hidden ? "•• ••" : formatEUR(interest)} />
          <Row label="Taux" value={`${RATE} % / an`} />
        </div>
        {target && <p className="mt-3 text-[11px] leading-relaxed text-faint">Versement immédiat sur {target.name}.</p>}
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
              Demande en cours…
            </>
          ) : (
            <>Demander {hidden ? "••" : formatEUR(amount)}</>
          )}
        </motion.button>
      </motion.div>

      {/* Prêts en cours */}
      {active.length > 0 && (
        <motion.div {...fadeUp} transition={{ duration: 0.45, delay: 0.25 }} className="mt-7">
          <h2 className="mb-2 font-display text-base font-semibold text-ink">Mes prêts en cours</h2>
          <div className="space-y-3">
            {active.map((loan) => {
              const progress = Math.min(1, 1 - loan.remainingCents / loan.amountCents);
              return (
                <motion.div key={loan.id} whileTap={{ scale: 0.985 }} className="card-shadow rounded-[24px] bg-white p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-display text-sm font-semibold text-ink">{loan.label}</div>
                      <div className="text-[11px] text-mut">
                        {formatEUR(loan.monthlyPaymentCents)} / mois · {loan.ratePercent} %
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-display text-sm font-semibold tabular-nums text-ink">
                        {hidden ? "•• ••" : formatEUR(loan.remainingCents)}
                      </div>
                      <div className="text-[11px] text-mut">restants</div>
                    </div>
                  </div>
                  <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-ink/[0.07]">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${progress * 100}%` }}
                      transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
                      className="h-full rounded-full bg-ink"
                    />
                  </div>
                </motion.div>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* Succès */}
      {stage === "done" && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="absolute inset-0 z-[70] grid place-items-center bg-paper/95 backdrop-blur-sm"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 260, damping: 20 }}
            className="flex flex-col items-center gap-3 text-center"
          >
            <SuccessCheck />
            <div className="font-display text-xl font-semibold text-ink">Prêt accordé</div>
            <div className="font-display text-3xl font-semibold text-mint">{hidden ? "•• ••" : formatEUR(amount)}</div>
            <div className="text-sm text-mut">versés sur {target?.name ?? "votre compte"}</div>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-mut">{label}</span>
      <span className={cn("tabular-nums text-ink", bold ? "font-display font-semibold" : "font-medium")}>{value}</span>
    </div>
  );
}
