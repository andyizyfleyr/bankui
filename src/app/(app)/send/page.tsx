"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Check, ChevronLeft, Loader2, Mail, Search, UserRound, Zap } from "lucide-react";
import type { SearchUser } from "@/lib/types";
import { cn, digitsToCents, firstName, formatEUR, formatEURShort } from "@/lib/format";
import { useBank } from "@/components/bank/bank-provider";
import { useOverlay } from "@/components/bank/app-shell";
import { AmountKeypad } from "@/components/bank/amount-keypad";
import { ContactAvatar } from "@/components/bank/avatar";
import { SuccessCheck } from "@/components/bank/success-check";

type Stage = "compose" | "confirm" | "busy" | "done";

const QUICK = [
  { label: "5 €", add: 500 },
  { label: "10 €", add: 1000 },
  { label: "20 €", add: 2000 },
  { label: "50 €", add: 5000 },
];

export default function SendPage() {
  const router = useRouter();
  const { user, primary, hidden, searchUsers, sendMoney } = useBank();
  const setOverlay = useOverlay();

  const [digits, setDigits] = useState("");
  const [recipient, setRecipient] = useState<SearchUser | null>(null);
  const [note, setNote] = useState("");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchUser[]>([]);
  const [searching, setSearching] = useState(false);
  const [stage, setStage] = useState<Stage>("compose");
  const [error, setError] = useState<string | null>(null);

  const cents = digitsToCents(digits);
  const overdrawn = primary ? cents > primary.balanceCents : false;
  const valid = cents > 0 && recipient !== null && !overdrawn;

  // Recherche différée d'utilisateurs réels
  useEffect(() => {
    let cancelled = false;
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    const t = setTimeout(async () => {
      const res = await searchUsers(q);
      if (!cancelled) {
        setResults(res);
        setSearching(false);
      }
    }, 220);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [query, searchUsers]);

  // Couche de confirmation / succès au-dessus de toute l'interface
  useEffect(() => {
    if (stage === "compose") {
      setOverlay(null);
      return;
    }
    setOverlay(
      <SendOverlay
        stage={stage}
        recipient={recipient}
        cents={cents}
        note={note.trim()}
        accountName={primary?.name ?? "Compte Courant"}
        accountLast4={primary?.last4 ?? "0000"}
        error={error}
        onCancel={() => setStage("compose")}
        onConfirm={async () => {
          if (!recipient) return;
          setStage("busy");
          setError(null);
          const res = await sendMoney(recipient.email, recipient.name, cents, note.trim() || undefined);
          if (res.ok) setStage("done");
          else {
            setError(res.error ?? "Erreur inconnue");
            setStage("confirm");
          }
        }}
        onNew={() => {
          setDigits("");
          setNote("");
          setRecipient(null);
          setStage("compose");
        }}
        onDone={() => router.push("/")}
      />
    );
    return () => setOverlay(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage, cents, recipient, note, error, hidden]);

  const quickAdd = (add: number) => {
    setDigits((d) => String(digitsToCents(d) + add));
  };

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
        <div>
          <h1 className="font-display text-lg font-semibold leading-tight tracking-tight text-ink">
            Envoyer de l&apos;argent
          </h1>
          <p className="mt-[1px] flex items-center gap-1 text-[11px] text-mut">
            <Zap className="h-3 w-3 text-mint" strokeWidth={2.5} />
            Instantané · 0 € de frais
          </p>
        </div>
      </div>

      {/* Recherche du destinataire */}
      {!recipient ? (
        <>
          <div className="relative mt-4 flex-none">
            <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-faint" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Nom ou email du destinataire…"
              autoFocus
              className="w-full rounded-2xl border border-line bg-white py-3.5 pl-11 pr-4 text-base text-ink placeholder:text-faint focus:border-ink/30 focus:outline-none"
            />
          </div>

          <div className="no-scrollbar mt-3 min-h-0 flex-1 overflow-y-auto">
            {query.trim().length < 2 ? (
              <p className="py-10 text-center text-sm text-mut">
                Cherchez un utilisateur par son nom ou son email.
              </p>
            ) : searching ? (
              <p className="py-10 text-center text-sm text-mut">
                <Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin" />
                Recherche…
              </p>
            ) : results.length === 0 ? (
              <p className="py-10 text-center text-sm text-mut">Aucun utilisateur trouvé</p>
            ) : (
              <ul>
                {results.map((u) => (
                  <li key={u.id}>
                    <button
                      onClick={() => {
                        setRecipient(u);
                        setQuery("");
                      }}
                      className="flex w-full items-center gap-3 rounded-2xl px-2 py-2.5 text-left transition-colors active:bg-ink/[0.04]"
                    >
                      <ContactAvatar name={u.name} color={u.color} size={44} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-ink">{u.name}</span>
                        <span className="flex items-center gap-1 text-xs text-mut">
                          <Mail className="h-3 w-3" />
                          {u.email}
                        </span>
                      </span>
                      <span className="grid h-6 w-6 flex-none place-items-center rounded-full border border-line bg-white text-transparent">
                        <Check className="h-3.5 w-3.5" strokeWidth={3} />
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      ) : (
        <>
          {/* Destinataire sélectionné */}
          <button
            onClick={() => {
              setRecipient(null);
              setStage("compose");
            }}
            className="mx-auto mt-4 flex flex-none items-center gap-2.5 rounded-full border border-line bg-white py-1.5 pl-1.5 pr-4"
          >
            <ContactAvatar name={recipient.name} color={recipient.color} size={34} />
            <span className="text-left">
              <span className="block text-sm font-semibold leading-tight text-ink">{recipient.name}</span>
              <span className="block text-[11px] leading-tight text-mut">{recipient.email}</span>
            </span>
            <UserRound className="ml-1 h-3.5 w-3.5 text-faint" />
          </button>

          {/* Montant */}
          <div className="flex-none pb-1 pt-5 text-center">
            <div
              className={cn(
                "font-display text-[44px] font-semibold leading-none tracking-tight tabular-nums transition-colors",
                cents > 0 ? "text-ink" : "text-faint"
              )}
            >
              {formatEUR(cents)}
            </div>
            <div className={cn("mt-2 text-xs", overdrawn ? "font-medium text-rose" : "text-mut")}>
              {overdrawn
                ? "Solde insuffisant"
                : `Disponible : ${hidden ? "•• ••" : formatEUR(primary?.balanceCents ?? 0)}`}
            </div>
            {/* Montants rapides — scrollables horizontalement */}
            <div className="no-scrollbar -mx-5 mt-3 flex gap-2 overflow-x-auto px-5">
              {QUICK.map((q) => (
                <motion.button
                  key={q.label}
                  whileTap={{ scale: 0.92 }}
                  onClick={() => quickAdd(q.add)}
                  className="shrink-0 rounded-full border border-line bg-white px-3 py-1.5 text-xs font-bold text-ink transition-colors hover:bg-ink/[0.05]"
                >
                  +{formatEURShort(q.add)}
                </motion.button>
              ))}
            </div>
          </div>

          {/* Message */}
          <div className="flex-none">
            <input
              value={note}
              onChange={(e) => setNote(e.target.value.slice(0, 60))}
              placeholder="Ajouter un message…"
              className="w-full rounded-full border border-line bg-white px-5 py-3 text-center text-base text-ink placeholder:text-faint focus:border-ink/30 focus:outline-none"
            />
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
              "mt-3.5 flex h-14 w-full flex-none items-center justify-center rounded-2xl font-display text-base font-semibold transition-all",
              valid ? "bg-ink text-white shadow-[0_16px_32px_-12px_rgba(11,15,20,0.5)]" : "bg-ink/[0.06] text-faint"
            )}
          >
            {recipient && cents > 0
              ? `Envoyer ${formatEUR(cents)} à ${firstName(recipient.name)}`
              : "Envoyer"}
          </motion.button>
        </>
      )}
    </div>
  );
}

interface OverlayProps {
  stage: Stage;
  recipient: SearchUser | null;
  cents: number;
  note: string;
  accountName: string;
  accountLast4: string;
  error: string | null;
  onCancel: () => void;
  onConfirm: () => void;
  onNew: () => void;
  onDone: () => void;
}

function SendOverlay(p: OverlayProps) {
  if (p.stage === "done") {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0, transition: { duration: 0.25 } }}
        className="relative flex h-full flex-col items-center justify-center overflow-hidden bg-paper px-8 text-center"
      >
        {/* Confettis */}
        {[...Array(10)].map((_, i) => (
          <motion.span
            key={i}
            className={cn(
              "absolute h-2 w-2 rounded-full",
              i % 3 === 0 ? "bg-lime" : i % 3 === 1 ? "bg-violet/60" : "bg-mint/60"
            )}
            style={{ left: "50%", top: "42%" }}
            initial={{ x: 0, y: 0, opacity: 1, scale: 0 }}
            animate={{
              x: Math.cos((i / 10) * Math.PI * 2) * (90 + (i % 4) * 22),
              y: Math.sin((i / 10) * Math.PI * 2) * (110 + (i % 4) * 26),
              opacity: 0,
              scale: 1.2,
            }}
            transition={{ duration: 1.1, delay: 0.15, ease: "easeOut" }}
          />
        ))}
        <SuccessCheck size={92} />
        <h2 className="mt-4 font-display text-2xl font-semibold text-ink">Envoyé !</h2>
        <p className="mt-1.5 text-sm text-mut">
          <span className="font-display font-semibold text-mint">{formatEUR(p.cents)}</span> à{" "}
          <span className="font-semibold text-ink">{p.recipient?.name}</span>
        </p>
        {p.note && <p className="mt-1 text-xs text-faint">« {p.note} »</p>}
        <div className="mt-9 flex w-full gap-3">
          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={p.onNew}
            className="h-[52px] flex-1 rounded-2xl border border-line bg-white font-display text-sm font-semibold text-ink"
          >
            Nouveau
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
          {p.recipient && <ContactAvatar name={p.recipient.name} color={p.recipient.color} size={64} />}
          <div className="mt-3 font-display text-base font-semibold text-ink">{p.recipient?.name}</div>
          <div className="flex items-center gap-1 text-xs text-mut">
            <Mail className="h-3 w-3" />
            {p.recipient?.email}
          </div>
          <div className="mt-4 font-display text-4xl font-semibold tracking-tight tabular-nums text-ink">
            {formatEUR(p.cents)}
          </div>
        </div>

        {/* Récapitulatif façon reçu */}
        <div className="mt-5 rounded-2xl border border-line bg-paper/60 px-4 py-1 text-sm">
          <ReceiptRow label="Depuis" value={`${p.accountName} ·· ${p.accountLast4}`} />
          <ReceiptRow label="Frais" value="0,00 €" accent />
          {p.note && <ReceiptRow label="Message" value={`« ${p.note} »`} truncate />}
          <div className="flex items-center justify-between border-t border-dashed border-ink/15 py-2.5">
            <span className="text-xs font-semibold uppercase tracking-wider text-mut">Total</span>
            <span className="font-display text-sm font-bold text-ink">{formatEUR(p.cents)}</span>
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
                Envoi…
              </>
            ) : (
              "Confirmer l'envoi"
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
  accent = false,
  truncate = false,
}: {
  label: string;
  value: string;
  accent?: boolean;
  truncate?: boolean;
}) {
  return (
    <div className="flex items-center justify-between border-b border-dashed border-ink/15 py-2.5 last:border-none">
      <span className="text-xs font-semibold uppercase tracking-wider text-mut">{label}</span>
      <span className={cn("text-sm font-medium", accent ? "text-mint" : "text-ink", truncate && "max-w-[60%] truncate")}>
        {value}
      </span>
    </div>
  );
}
