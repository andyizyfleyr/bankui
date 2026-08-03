"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { CreditCard, Loader2, Mail, Smartphone, Wallet, type LucideIcon } from "lucide-react";
import { cn, digitsToCents, formatEUR } from "@/lib/format";
import { useBank } from "@/components/bank/bank-provider";
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

const PROVIDER_ICONS: Record<WithdrawProvider, LucideIcon> = {
  momo: Smartphone,
  moov: Smartphone,
  paypal: Mail,
  bank: CreditCard,
};

const fadeUp = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
};

export default function WithdrawPage() {
  const { accounts, withdraw, hidden } = useBank();
  const [providerId, setProviderId] = useState<WithdrawProvider>("momo");
  const [identifier, setIdentifier] = useState("");
  const [digits, setDigits] = useState("");
  const [stage, setStage] = useState<"edit" | "busy" | "done">("edit");
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
  const valid = identifierOk && inRange && !overdrawn && stage !== "busy" && !!source;

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
    const res = await withdraw(providerId, identifier.trim(), amount);
    if (res.ok) setStage("done");
    else {
      setError(res.error ?? "Erreur inconnue");
      setStage("edit");
    }
  };

  return (
    <div className="px-5 pb-10 pt-6">
      <motion.div {...fadeUp} transition={{ duration: 0.4 }}>
        <h1 className="font-display text-xl font-semibold tracking-tight text-ink">Retrait d&apos;argent</h1>
        <p className="mt-0.5 text-sm text-mut">Vers votre mobile money ou compte bancaire</p>
      </motion.div>

      {/* Fournisseur */}
      <motion.div {...fadeUp} transition={{ duration: 0.45, delay: 0.05 }} className="mt-5">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="font-display text-base font-semibold text-ink">Destinataire</h2>
          <span className="text-xs font-medium text-mut">jusqu&apos;à {formatEUR(WITHDRAW_MAX_CENTS)}</span>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {WITHDRAW_PROVIDER_LIST.map((p) => {
            const active = p.id === providerId;
            return (
              <motion.button
                key={p.id}
                whileTap={{ scale: 0.95 }}
                onClick={() => setProviderId(p.id)}
                className={cn(
                  "relative flex flex-col items-start gap-2.5 rounded-[22px] border p-3.5 text-left transition-colors",
                  active ? "border-ink bg-white shadow-[0_14px_28px_-12px_rgba(11,15,20,0.25)]" : "border-line bg-white"
                )}
              >
                <span
                  className={cn(
                    "pointer-events-none absolute right-3 top-3 h-2 w-2 rounded-full",
                    active ? "bg-lime ring-4 ring-lime/30" : "bg-ink/[0.08]"
                  )}
                />
                <ProviderLogo logo={p.logo} />
                <span className="min-w-0">
                  <span className={cn("block truncate text-sm font-semibold", active ? "text-ink" : "text-ink/90")}>
                    {p.label}
                  </span>
                  <span className="mt-0.5 block text-[10px] leading-tight text-mut">{p.hint}</span>
                </span>
              </motion.button>
            );
          })}
        </div>
      </motion.div>

      {/* Identifiant */}
      <motion.div {...fadeUp} transition={{ duration: 0.45, delay: 0.1 }} className="mt-4">
        <label className="block">
          <span className="mb-1.5 block text-xs font-bold uppercase tracking-[0.12em] text-mut">
            {providerId === "paypal" ? "E-mail" : "Numéro ou référence"}
          </span>
          <div className="relative">
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
          </div>
        </label>
      </motion.div>

      {/* Montant */}
      <motion.div
        {...fadeUp}
        transition={{ duration: 0.45, delay: 0.15 }}
        className="card-shadow mt-4 rounded-[28px] bg-white p-5"
      >
        <div className="flex items-baseline justify-between">
          <h2 className="font-display text-base font-semibold text-ink">Montant</h2>
          <div className="text-right">
            <div className={cn("font-display text-lg font-semibold tabular-nums", amount > 0 ? "text-ink" : "text-faint")}>
              {hidden ? "•• ••" : formatEUR(amount)}
            </div>
            <div className="text-[11px] text-mut">de 10 € à 10 000 €</div>
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
                digitsToCents(digits) === a ? "border-transparent bg-ink text-white" : "border-line bg-white text-ink hover:bg-ink/[0.05]"
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

      {/* Récapitulatif */}
      <motion.div {...fadeUp} transition={{ duration: 0.45, delay: 0.2 }} className="card-shadow mt-4 rounded-[28px] bg-white p-5">
        <div className="space-y-2.5 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-mut">Retrait vers</span>
            <span className="font-medium text-ink">{provider.label}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-mut">Frais</span>
            <span className={cn("font-medium tabular-nums", fee > 0 ? "text-ink" : "text-mint")}>
              {hidden ? "••" : fee > 0 ? formatEUR(fee) : "Gratuit"}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-mut">Total prélevé</span>
            <span className="font-display font-semibold tabular-nums text-ink">{hidden ? "•• ••" : formatEUR(total)}</span>
          </div>
          <div className="flex items-center justify-between border-t border-line pt-2.5">
            <span className="text-mut">Disponible</span>
            <span className="font-medium tabular-nums text-mut">{hidden ? "•• ••" : formatEUR(source?.balanceCents ?? 0)}</span>
          </div>
        </div>
        {overdrawn && (
          <p className="mt-3 text-center text-xs font-medium text-rose">Montant supérieur au solde disponible</p>
        )}
        {error && <p className="mt-3 text-center text-xs font-medium text-rose">{error}</p>}
        <motion.button
          whileTap={valid ? { scale: 0.97 } : undefined}
          onClick={confirm}
          disabled={!valid}
          className={cn(
            "mt-4 flex h-14 w-full items-center justify-center gap-2 rounded-2xl font-display text-base font-semibold transition-all",
            valid ? "bg-ink text-white shadow-[0_16px_32px_-12px_rgba(11,15,20,0.5)]" : "bg-ink/[0.06] text-faint"
          )}
        >
          {stage === "busy" ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              Retrait en cours…
            </>
          ) : (
            <>
              <Wallet className="h-5 w-5" strokeWidth={2.2} />
              Retirer {hidden ? "••" : formatEUR(amount)}
            </>
          )}
        </motion.button>
      </motion.div>

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
            <div className="font-display text-xl font-semibold text-ink">Retrait envoyé</div>
            <div className="font-display text-3xl font-semibold text-mint">{hidden ? "•• ••" : formatEUR(amount)}</div>
            <div className="flex items-center gap-2 text-sm text-mut">
              <ProviderLogo logo={provider.logo} size={22} />
              vers {provider.label}
            </div>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
}

function ProviderLogo({ logo, size = 40 }: { logo: string; size?: number }) {
  if (logo === "nova") {
    return (
      <span className="grid h-11 w-11 place-items-center overflow-hidden rounded-2xl border border-line bg-white">
        <NovaLogo size={size} />
      </span>
    );
  }
  return (
    <span
      className="grid place-items-center overflow-hidden rounded-2xl border border-line bg-white"
      style={{ width: 44, height: 44 }}
    >
      <img
        src={logo}
        alt=""
        className="object-contain"
        style={{ width: size, height: size }}
        draggable={false}
      />
    </span>
  );
}
