"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { BadgePercent, CalendarDays, ChevronLeft, Loader2, Wallet } from "lucide-react";
import { cn, digitsToCents, formatEUR, formatEURShort } from "@/lib/format";
import { useBank } from "@/components/bank/bank-provider";
import { useOverlay } from "@/components/bank/app-shell";
import { AmountKeypad } from "@/components/bank/amount-keypad";
import { SuccessCheck } from "@/components/bank/success-check";

const RATE = 5;
const AMOUNTS = [10_000, 50_000, 100_000, 500_000, 1_000_000];
const TERMS = [12, 24, 36, 48, 60];
const MIN_LOAN_CENTS = 10_000;
const MAX_LOAN_CENTS = 1_000_000;

type Stage = "compose" | "confirm" | "busy" | "done";

function monthlyPaymentCents(amountCents: number, termMonths: number): number {
  if (termMonths <= 0) return amountCents;
  const r = RATE / 100 / 12;
  if (r === 0) return Math.ceil(amountCents / termMonths);
  return Math.ceil((amountCents * r) / (1 - Math.pow(1 + r, -termMonths)));
}

export default function LoanPage() {
  const router = useRouter();
  const { loans, accounts, requestLoan, hidden } = useBank();
  const setOverlay = useOverlay();

  const [digits, setDigits] = useState("500");
  const [term, setTerm] = useState(24);
  const [stage, setStage] = useState<Stage>("compose");
  const [error, setError] = useState<string | null>(null);

  const amount = digitsToCents(digits);
  const valid = amount >= MIN_LOAN_CENTS && amount <= MAX_LOAN_CENTS;
  const payment = monthlyPaymentCents(amount, term);
  const total = payment * term;
  const interest = total - amount;
  const active = useMemo(() => loans.filter((l) => l.status === "active"), [loans]);
  const target = accounts.find((a) => a.type === "courant") ?? accounts[0];

  // Confirmation / succès au-dessus de l'interface (plein cadre, sans scroll)
  useEffect(() => {
    if (stage === "compose") {
      setOverlay(null);
      return;
    }
    setOverlay(
      <LoanOverlay
        stage={stage}
        amount={amount}
        term={term}
        payment={payment}
        total={total}
        interest={interest}
        targetName={target?.name ?? "Compte Courant"}
        error={error}
        onCancel={() => setStage("compose")}
        onConfirm={async () => {
          setStage("busy");
          setError(null);
          const res = await requestLoan(amount, term);
          if (res.ok) setStage("done");
          else {
            setError(res.error ?? "Erreur inconnue");
            setStage("confirm");
          }
        }}
        onNew={() => {
          setDigits("500");
          setTerm(24);
          setStage("compose");
        }}
        onDone={() => router.push("/")}
      />
    );
    return () => setOverlay(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage, amount, term, payment, total, interest, error, hidden]);

  return (
    <div className="flex h-full min-h-full flex-col px-5 pb-6 pt-4 md:mx-auto md:w-full md:max-w-[520px] md:px-6 md:pt-6">
      {/* En-tête */}
      <div className="flex flex-none items-center gap-3">
        <Link
          href="/"
          aria-label="Retour"
          className="card-shadow grid h-10 w-10 place-items-center rounded-full bg-white text-ink"
        >
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <div className="min-w-0">
          <h1 className="font-display text-lg font-semibold leading-tight tracking-tight text-ink">Prêt d&apos;argent</h1>
          <p className="mt-[1px] flex items-center gap-1 text-[11px] text-mut">
            <BadgePercent className="h-3.5 w-3.5 text-lime" strokeWidth={2.5} />
            Jusqu&apos;à 10 000 € · {RATE} % / an
          </p>
        </div>
      </div>

      {/* Montant */}
      <div className="flex-none pt-4 text-center">
        <div
          className={cn(
            "font-display text-[42px] font-semibold leading-none tracking-tight tabular-nums transition-colors",
            amount > 0 ? "text-ink" : "text-faint"
          )}
        >
          {hidden ? "•• ••" : formatEUR(amount)}
        </div>
        <div className="mt-2 text-xs text-mut">de 100 € à 10 000 €</div>
        <div className="no-scrollbar -mx-5 mt-3 flex gap-2 overflow-x-auto px-5">
          {AMOUNTS.map((a) => (
            <motion.button
              key={a}
              whileTap={{ scale: 0.92 }}
              onClick={() => setDigits(String(Math.round(a / 100)))}
              className={cn(
                "shrink-0 rounded-full border px-3 py-1.5 text-xs font-bold transition-colors",
                amount === a ? "border-transparent bg-ink text-white" : "border-line bg-white text-ink hover:bg-ink/[0.05]"
              )}
            >
              {formatEURShort(a)}
            </motion.button>
          ))}
          <motion.button
            whileTap={{ scale: 0.92 }}
            onClick={() => setDigits(String(Math.round(MAX_LOAN_CENTS / 100)))}
            className={cn(
              "shrink-0 rounded-full px-3 py-1.5 text-xs font-bold transition-colors",
              amount === MAX_LOAN_CENTS ? "border-transparent bg-ink text-white" : "bg-ink/[0.06] text-ink"
            )}
          >
            Max
          </motion.button>
        </div>
      </div>

      {/* Durée + mensualité */}
      <div className="flex-none pt-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-[0.12em] text-mut">Durée</span>
          <span className="flex items-center gap-1.5 text-xs font-semibold text-mut">
            <CalendarDays className="h-4 w-4" />
            {term} mois
          </span>
        </div>
        <div className="mt-2 flex gap-2">
          {TERMS.map((t) => (
            <motion.button
              key={t}
              whileTap={{ scale: 0.92 }}
              onClick={() => setTerm(t)}
              className={cn(
                "flex-1 rounded-full border px-2 py-2 text-xs font-bold transition-colors",
                term === t ? "border-transparent bg-ink text-white" : "border-line bg-white text-ink hover:bg-ink/[0.05]"
              )}
            >
              {t}m
            </motion.button>
          ))}
        </div>
        <div className="mt-2.5 flex items-center justify-between rounded-2xl border border-line bg-paper/60 px-4 py-2.5">
          <span className="text-xs text-mut">Mensualité estimée</span>
          <span className="font-display text-sm font-semibold tabular-nums text-ink">
            {hidden ? "•• ••" : `${formatEUR(payment)} / mois`}
          </span>
        </div>
      </div>

      {/* Prêts en cours — liste scrollable en interne uniquement */}
      {active.length > 0 ? (
        <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto pt-3">
          <h2 className="mb-1.5 text-xs font-bold uppercase tracking-[0.12em] text-mut">Mes prêts</h2>
          <div className="space-y-2">
            {active.map((loan) => {
              const progress = Math.min(1, 1 - loan.remainingCents / loan.amountCents);
              return (
                <div key={loan.id} className="rounded-2xl border border-line bg-white p-3.5">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-semibold text-ink">{loan.label}</div>
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
                  <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-ink/[0.07]">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${progress * 100}%` }}
                      transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
                      className="h-full rounded-full bg-ink"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="min-h-0 flex-1" />
      )}

      {/* Pavé numérique */}
      <div className="flex-none pt-3">
        <AmountKeypad digits={digits} onChange={setDigits} compact />
      </div>

      {/* CTA */}
      <motion.button
        whileTap={valid ? { scale: 0.97 } : undefined}
        onClick={() => valid && setStage("confirm")}
        disabled={!valid}
        className={cn(
          "mt-3 flex h-14 w-full flex-none items-center justify-center gap-2 rounded-2xl font-display text-base font-semibold transition-all",
          valid ? "bg-ink text-white shadow-[0_16px_32px_-12px_rgba(11,15,20,0.5)]" : "bg-ink/[0.06] text-faint"
        )}
      >
        <Wallet className="h-5 w-5" strokeWidth={2.2} />
        {amount > 0 ? `Demander ${hidden ? "••" : formatEUR(amount)}` : "Demander"}
      </motion.button>
    </div>
  );
}

interface OverlayProps {
  stage: Stage;
  amount: number;
  term: number;
  payment: number;
  total: number;
  interest: number;
  targetName: string;
  error: string | null;
  onCancel: () => void;
  onConfirm: () => void;
  onNew: () => void;
  onDone: () => void;
}

function LoanOverlay(p: OverlayProps) {
  if (p.stage === "done") {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0, transition: { duration: 0.25 } }}
        className="relative flex h-full flex-col items-center justify-center bg-paper px-8 text-center"
      >
        <SuccessCheck size={88} />
        <h2 className="mt-4 font-display text-2xl font-semibold text-ink">Prêt accordé</h2>
        <p className="mt-1.5 text-sm text-mut">
          <span className="font-display text-xl font-semibold text-mint">{formatEUR(p.amount)}</span> versés sur{" "}
          <span className="font-semibold text-ink">{p.targetName}</span>
        </p>
        <div className="mt-9 flex w-full gap-3">
          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={p.onNew}
            className="h-[52px] flex-1 rounded-2xl border border-line bg-white font-display text-sm font-semibold text-ink"
          >
            Nouveau prêt
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={p.onDone}
            className="h-[52px] flex-1 rounded-2xl bg-ink font-display text-sm font-semibold text-white shadow-[0_16px_32px_-12px_rgba(11,15,20,0.5)]"
          >
            Terminer
          </motion.button>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="relative flex h-full flex-col justify-end">
      <div
        className="absolute inset-0 bg-ink/45 backdrop-blur-[3px]"
        onClick={p.stage !== "busy" ? p.onCancel : undefined}
      />
      <motion.div
        initial={{ y: "45%" }}
        animate={{ y: 0 }}
        exit={{ y: "45%" }}
        transition={{ type: "spring", stiffness: 340, damping: 33 }}
        className="relative w-full rounded-t-[32px] bg-white px-5 pb-8 pt-2.5 shadow-[0_-24px_60px_-24px_rgba(16,24,40,0.35)] md:mx-auto md:mb-8 md:max-w-[440px] md:rounded-[32px] md:shadow-[0_40px_80px_-32px_rgba(16,24,40,0.5)]"
      >
        <div className="mx-auto mb-5 h-[5px] w-10 rounded-full bg-ink/[0.12]" />

        <div className="flex flex-col items-center text-center">
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-ink text-lime">
            <Wallet className="h-5 w-5" strokeWidth={2.3} />
          </span>
          <div className="mt-2.5 font-display text-base font-semibold text-ink">Récapitulatif du prêt</div>
          <div className="mt-1 font-display text-3xl font-semibold tracking-tight tabular-nums text-ink">
            {formatEUR(p.amount)}
          </div>
        </div>

        <div className="mt-5 rounded-2xl border border-line bg-paper/60 px-4 py-1 text-sm">
          <ReceiptRow label="Durée" value={`${p.term} mois`} />
          <ReceiptRow label="Mensualité" value={`${formatEUR(p.payment)} / mois`} bold />
          <ReceiptRow label="Coût total" value={formatEUR(p.total)} />
          <ReceiptRow label="Intérêts" value={formatEUR(p.interest)} />
          <ReceiptRow label="Taux" value={`${RATE} % / an`} />
          <div className="flex items-center justify-between border-t border-dashed border-ink/15 py-2.5">
            <span className="text-xs font-semibold uppercase tracking-wider text-mut">Versement</span>
            <span className="font-display text-sm font-bold text-ink">{p.targetName}</span>
          </div>
        </div>

        {p.error && <p className="mt-3 text-center text-xs font-medium text-rose">{p.error}</p>}

        <div className="mt-5 flex gap-3">
          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={p.onCancel}
            disabled={p.stage === "busy"}
            className="h-[52px] flex-1 rounded-2xl border border-line bg-white font-display text-sm font-semibold text-ink disabled:opacity-50"
          >
            Annuler
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={p.onConfirm}
            disabled={p.stage === "busy"}
            className="flex h-[52px] flex-1 items-center justify-center gap-2 rounded-2xl bg-ink font-display text-sm font-semibold text-white shadow-[0_16px_32px_-12px_rgba(11,15,20,0.5)]"
          >
            {p.stage === "busy" ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Demande en cours…
              </>
            ) : (
              "Confirmer le prêt"
            )}
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function ReceiptRow({
  label,
  value,
  bold = false,
}: {
  label: string;
  value: string;
  bold?: boolean;
}) {
  return (
    <div className="flex items-center justify-between border-b border-dashed border-ink/15 py-2.5 last:border-none">
      <span className="text-xs font-semibold uppercase tracking-wider text-mut">{label}</span>
      <span className={cn("text-sm font-medium tabular-nums", bold ? "font-display font-bold text-ink" : "text-ink")}>
        {value}
      </span>
    </div>
  );
}
