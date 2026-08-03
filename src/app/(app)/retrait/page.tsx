"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { BadgePercent, ChevronLeft, CreditCard, Loader2, Mail, ShieldCheck, Smartphone, Wallet, type LucideIcon } from "lucide-react";
import { cn, digitsToCents, formatEUR, formatEURShort } from "@/lib/format";
import { useBank } from "@/components/bank/bank-provider";
import { useOverlay } from "@/components/bank/app-shell";
import { AmountKeypad } from "@/components/bank/amount-keypad";
import { SuccessCheck } from "@/components/bank/success-check";
import { NovaLogo } from "@/components/bank/nova-logo";
import {
  WITHDRAW_MAX_CENTS,
  WITHDRAW_MIN_CENTS,
  WITHDRAW_PROVIDER_LIST,
  withdrawFeeCents,
  type WithdrawProvider,
} from "@/lib/withdraw";

const AMOUNTS = [5_000, 20_000, 50_000, 100_000];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type Stage = "compose" | "confirm" | "busy" | "done";

const PROVIDER_ICONS: Record<WithdrawProvider, LucideIcon> = {
  momo: Smartphone,
  moov: Smartphone,
  paypal: Mail,
  bank: CreditCard,
};

export default function WithdrawPage() {
  const router = useRouter();
  const { accounts, withdraw, hidden } = useBank();
  const setOverlay = useOverlay();

  const [providerId, setProviderId] = useState<WithdrawProvider>("momo");
  const [identifier, setIdentifier] = useState("");
  const [digits, setDigits] = useState("");
  const [stage, setStage] = useState<Stage>("compose");
  const [error, setError] = useState<string | null>(null);

  const provider = useMemo(() => WITHDRAW_PROVIDER_LIST.find((p) => p.id === providerId)!, [providerId]);
  const Icon = PROVIDER_ICONS[providerId];
  const source = accounts.find((a) => a.type === "courant") ?? accounts[0];

  const amount = digitsToCents(digits);
  const fee = withdrawFeeCents(amount, provider.feePercent);
  const total = amount + fee;
  const identifierOk = identifier.trim().length >= 3 && (providerId !== "paypal" || EMAIL_RE.test(identifier.trim()));
  const inRange = amount >= WITHDRAW_MIN_CENTS && amount <= WITHDRAW_MAX_CENTS;
  const overdrawn = source ? total > source.balanceCents : false;
  const valid = identifierOk && inRange && !overdrawn && !!source;

  // Montant maximal : min(limite, solde après frais) avec solde couvrant le total.
  const maxCents = useMemo(() => {
    if (!source) return 0;
    const cap = Math.min(WITHDRAW_MAX_CENTS, source.balanceCents);
    const p = provider.feePercent;
    let m = Math.floor((source.balanceCents * 100) / (100 + p));
    while (m > 0 && m + withdrawFeeCents(m, p) > source.balanceCents) m -= 1;
    return Math.min(cap, Math.max(0, m));
  }, [source, provider.feePercent]);

  // Confirmation / succès au-dessus de l'interface (plein cadre, sans scroll)
  useEffect(() => {
    if (stage === "compose") {
      setOverlay(null);
      return;
    }
    setOverlay(
      <WithdrawOverlay
        stage={stage}
        provider={provider}
        identifier={identifier.trim()}
        amount={amount}
        fee={fee}
        total={total}
        accountName={source?.name ?? "Compte Courant"}
        error={error}
        onCancel={() => setStage("compose")}
        onConfirm={async () => {
          setStage("busy");
          setError(null);
          const res = await withdraw(providerId, identifier.trim(), amount);
          if (res.ok) setStage("done");
          else {
            setError(res.error ?? "Erreur inconnue");
            setStage("confirm");
          }
        }}
        onNew={() => {
          setIdentifier("");
          setDigits("");
          setStage("compose");
        }}
        onDone={() => router.push("/")}
      />
    );
    return () => setOverlay(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage, providerId, identifier, amount, fee, total, error, hidden]);

  return (
    <div className="flex h-full min-h-full flex-col px-5 pb-6 pt-4">
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
          <h1 className="font-display text-lg font-semibold leading-tight tracking-tight text-ink">Retrait d&apos;argent</h1>
          <p className="mt-[1px] flex items-center gap-1 text-[11px] text-mut">
            <ShieldCheck className="h-3.5 w-3.5 text-mint" strokeWidth={2.5} />
            Instantané · vers mobile money ou banque
          </p>
        </div>
      </div>

      {/* Destinataire — chips scrollables horizontalement */}
      <div className="flex-none pt-3">
        <span className="text-xs font-bold uppercase tracking-[0.12em] text-mut">Destinataire</span>
        <div className="no-scrollbar -mx-5 mt-2 flex gap-2.5 overflow-x-auto px-5 pb-0.5">
          {WITHDRAW_PROVIDER_LIST.map((p) => {
            const active = p.id === providerId;
            return (
              <motion.button
                key={p.id}
                whileTap={{ scale: 0.94 }}
                onClick={() => setProviderId(p.id)}
                className={cn(
                  "flex w-[124px] shrink-0 flex-col items-center gap-1.5 rounded-[20px] border p-3 transition-colors",
                  active
                    ? "border-ink bg-white shadow-[0_12px_24px_-10px_rgba(11,15,20,0.25)]"
                    : "border-line bg-white"
                )}
              >
                <ProviderLogo logo={p.logo} />
                <span className={cn("max-w-full truncate text-xs font-semibold", active ? "text-ink" : "text-ink/90")}>
                  {p.label}
                </span>
                <span className="flex items-center gap-0.5 text-[10px] font-medium text-mut">
                  {p.feePercent > 0 ? (
                    <>
                      <BadgePercent className="h-3 w-3" />
                      {p.feePercent} %
                    </>
                  ) : (
                    "Sans frais"
                  )}
                </span>
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* Identifiant */}
      <label className="relative mt-3 flex-none">
        <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-mut">
          <Icon className="h-[18px] w-[18px]" />
        </span>
        <input
          type="text"
          value={identifier}
          onChange={(e) => setIdentifier(e.target.value)}
          placeholder={provider.placeholder}
          inputMode={providerId === "paypal" ? "email" : "tel"}
          className="w-full rounded-2xl border border-line bg-paper/60 py-3.5 pl-11 pr-4 text-base text-ink placeholder:text-faint focus:border-ink/30 focus:outline-none"
        />
      </label>

      {/* Montant */}
      <div className="flex-none pt-3 text-center">
        <div
          className={cn(
            "font-display text-[42px] font-semibold leading-none tracking-tight tabular-nums transition-colors",
            amount > 0 ? "text-ink" : "text-faint"
          )}
        >
          {hidden ? "•• ••" : formatEUR(amount)}
        </div>
        <div className={cn("mt-2 text-xs", overdrawn ? "font-medium text-rose" : "text-mut")}>
          {overdrawn ? "Solde insuffisant" : `Disponible : ${hidden ? "•• ••" : formatEUR(source?.balanceCents ?? 0)}`}
        </div>
        <div className="no-scrollbar -mx-5 mt-3 flex gap-2 overflow-x-auto px-5">
          {AMOUNTS.map((a) => (
            <motion.button
              key={a}
              whileTap={{ scale: 0.92 }}
              onClick={() => setDigits(String(a))}
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
            onClick={() => setDigits(String(maxCents))}
            className={cn(
              "shrink-0 rounded-full px-3 py-1.5 text-xs font-bold transition-colors",
              amount === maxCents ? "border-transparent bg-ink text-white" : "bg-ink/[0.06] text-ink"
            )}
          >
            Max
          </motion.button>
        </div>
      </div>

      {/* Récap compact */}
      <div className="mt-2.5 flex flex-none items-center justify-between rounded-2xl border border-line bg-paper/60 px-4 py-2.5">
        <span className="text-xs text-mut">Frais</span>
        <span className={cn("text-xs font-semibold tabular-nums", fee > 0 ? "text-ink" : "text-mint")}>
          {hidden ? "••" : fee > 0 ? formatEUR(fee) : "Gratuit"}
        </span>
        <span className="h-4 w-px bg-line" />
        <span className="text-xs text-mut">Total</span>
        <span className="font-display text-sm font-semibold tabular-nums text-ink">{hidden ? "•• ••" : formatEUR(total)}</span>
      </div>

      {/* Espace souple */}
      <div className="min-h-0 flex-1" />

      {/* Pavé numérique */}
      <div className="flex-none">
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
        {amount > 0 ? `Retirer ${hidden ? "••" : formatEUR(amount)}` : "Retirer"}
      </motion.button>
    </div>
  );
}

interface OverlayProps {
  stage: Stage;
  provider: (typeof WITHDRAW_PROVIDER_LIST)[number];
  identifier: string;
  amount: number;
  fee: number;
  total: number;
  accountName: string;
  error: string | null;
  onCancel: () => void;
  onConfirm: () => void;
  onNew: () => void;
  onDone: () => void;
}

function WithdrawOverlay(p: OverlayProps) {
  if (p.stage === "done") {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0, transition: { duration: 0.25 } }}
        className="relative flex h-full flex-col items-center justify-center bg-paper px-8 text-center"
      >
        <SuccessCheck size={88} />
        <h2 className="mt-4 font-display text-2xl font-semibold text-ink">Retrait envoyé</h2>
        <p className="mt-1.5 text-sm text-mut">
          <span className="font-display text-xl font-semibold text-mint">{formatEUR(p.amount)}</span> vers{" "}
          <span className="font-semibold text-ink">{p.provider.label}</span>
        </p>
        <div className="mt-9 flex w-full gap-3">
          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={p.onNew}
            className="h-[52px] flex-1 rounded-2xl border border-line bg-white font-display text-sm font-semibold text-ink"
          >
            Nouveau retrait
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
        className="relative rounded-t-[32px] bg-white px-5 pb-8 pt-2.5 shadow-[0_-24px_60px_-24px_rgba(16,24,40,0.35)]"
      >
        <div className="mx-auto mb-5 h-[5px] w-10 rounded-full bg-ink/[0.12]" />

        <div className="flex flex-col items-center text-center">
          <ProviderLogo logo={p.provider.logo} size={44} />
          <div className="mt-2.5 font-display text-base font-semibold text-ink">Vers {p.provider.label}</div>
          <div className="mt-1 font-display text-3xl font-semibold tracking-tight tabular-nums text-ink">
            {formatEUR(p.amount)}
          </div>
        </div>

        <div className="mt-5 rounded-2xl border border-line bg-paper/60 px-4 py-1 text-sm">
          <ReceiptRow label="Destinataire" value={p.identifier} truncate />
          <ReceiptRow label="Frais" value={p.fee > 0 ? formatEUR(p.fee) : "Gratuit"} accent={p.fee === 0} />
          <ReceiptRow label="Depuis" value={p.accountName} />
          <div className="flex items-center justify-between border-t border-dashed border-ink/15 py-2.5">
            <span className="text-xs font-semibold uppercase tracking-wider text-mut">Total prélevé</span>
            <span className="font-display text-sm font-bold text-ink">{formatEUR(p.total)}</span>
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
                Retrait en cours…
              </>
            ) : (
              "Confirmer le retrait"
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
  truncate = false,
  accent = false,
}: {
  label: string;
  value: string;
  truncate?: boolean;
  accent?: boolean;
}) {
  return (
    <div className="flex items-center justify-between border-b border-dashed border-ink/15 py-2.5 last:border-none">
      <span className="text-xs font-semibold uppercase tracking-wider text-mut">{label}</span>
      <span className={cn("text-sm font-medium tabular-nums", accent ? "text-mint" : "text-ink", truncate && "max-w-[55%] truncate")}>
        {value}
      </span>
    </div>
  );
}

function ProviderLogo({ logo, size = 40 }: { logo: string; size?: number }) {
  if (logo === "nova") {
    return (
      <span className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-2xl border border-line bg-white">
        <NovaLogo size={size} />
      </span>
    );
  }
  return (
    <span
      className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-2xl border border-line bg-white"
    >
      <img src={logo} alt="" className="object-contain" style={{ width: size, height: size }} draggable={false} />
    </span>
  );
}
