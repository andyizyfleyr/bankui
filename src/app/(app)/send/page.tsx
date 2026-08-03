"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Check, ChevronLeft, Loader2, Search, Zap } from "lucide-react";
import type { Contact } from "@/lib/types";
import { cn, digitsToCents, firstName, formatEUR } from "@/lib/format";
import { useBank } from "@/components/bank/bank-provider";
import { useOverlay } from "@/components/bank/app-shell";
import { AmountKeypad } from "@/components/bank/amount-keypad";
import { ContactAvatar } from "@/components/bank/avatar";
import { SuccessCheck } from "@/components/bank/success-check";

type Stage = "compose" | "confirm" | "busy" | "done";

const QUICK = [
  { label: "+5 €", add: 500 },
  { label: "+10 €", add: 1000 },
  { label: "+20 €", add: 2000 },
  { label: "+50 €", add: 5000 },
];

export default function SendPage() {
  const router = useRouter();
  const { contacts, primary, hidden, sendMoney } = useBank();
  const setOverlay = useOverlay();

  const [digits, setDigits] = useState("");
  const [contactId, setContactId] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [query, setQuery] = useState("");
  const [stage, setStage] = useState<Stage>("compose");
  const [error, setError] = useState<string | null>(null);

  const cents = digitsToCents(digits);
  const contact = contacts.find((c) => c.id === contactId) ?? null;
  const overdrawn = primary ? cents > primary.balanceCents : false;
  const valid = cents > 0 && contact !== null && !overdrawn;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return contacts;
    return contacts.filter((c) => c.name.toLowerCase().includes(q) || c.handle.toLowerCase().includes(q));
  }, [contacts, query]);

  // Couche de confirmation / succès au-dessus de toute l'interface
  useEffect(() => {
    if (stage === "compose") {
      setOverlay(null);
      return;
    }
    setOverlay(
      <SendOverlay
        stage={stage}
        contact={contact}
        cents={cents}
        note={note.trim()}
        accountName={primary?.name ?? "Compte Courant"}
        accountLast4={primary?.last4 ?? "0000"}
        error={error}
        onCancel={() => setStage("compose")}
        onConfirm={async () => {
          if (!contact) return;
          setStage("busy");
          setError(null);
          const res = await sendMoney(contact.id, cents, note.trim() || undefined);
          if (res.ok) setStage("done");
          else {
            setError(res.error ?? "Erreur inconnue");
            setStage("confirm");
          }
        }}
        onNew={() => {
          setDigits("");
          setNote("");
          setStage("compose");
        }}
        onDone={() => router.push("/")}
      />
    );
    return () => setOverlay(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage, cents, contactId, note, error, hidden]);

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

      {/* Montant */}
      <div className="flex-none pb-1 pt-4 text-center">
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
        {/* Montants rapides */}
        <div className="mt-3 flex justify-center gap-2">
          {QUICK.map((q) => (
            <motion.button
              key={q.label}
              whileTap={{ scale: 0.92 }}
              onClick={() => quickAdd(q.add)}
              className="rounded-full border border-line bg-white px-3 py-1.5 text-xs font-bold text-ink transition-colors hover:bg-ink/[0.05]"
            >
              {q.label}
            </motion.button>
          ))}
        </div>
      </div>

      {/* Favoris */}
      <div className="no-scrollbar -mx-5 flex flex-none snap-x gap-3.5 overflow-x-auto px-5 pb-1 pt-2.5">
        {contacts.slice(0, 8).map((c) => (
          <FavoriteContact key={c.id} contact={c} active={c.id === contactId} onSelect={() => setContactId(c.id)} />
        ))}
      </div>

      {/* Recherche */}
      <div className="relative mt-2.5 flex-none">
        <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-faint" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Rechercher un contact…"
          className="w-full rounded-2xl border border-line bg-white py-3 pl-11 pr-4 text-base text-ink placeholder:text-faint focus:border-ink/30 focus:outline-none"
        />
      </div>

      {/* Liste des contacts */}
      <div className="no-scrollbar mt-2 min-h-0 flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <p className="py-8 text-center text-sm text-mut">Aucun contact trouvé</p>
        ) : (
          <ul>
            {filtered.map((c) => (
              <li key={c.id}>
                <button
                  onClick={() => setContactId(c.id)}
                  className="flex w-full items-center gap-3 rounded-2xl px-2 py-2.5 text-left transition-colors active:bg-ink/[0.04]"
                >
                  <ContactAvatar name={c.name} color={c.color} size={42} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-ink">{c.name}</span>
                    <span className="block text-xs text-mut">{c.handle}</span>
                  </span>
                  <span
                    className={cn(
                      "grid h-6 w-6 place-items-center rounded-full border transition-all",
                      c.id === contactId ? "border-ink bg-ink text-lime" : "border-line bg-white text-transparent"
                    )}
                  >
                    <Check className="h-3.5 w-3.5" strokeWidth={3} />
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Message */}
      <input
        value={note}
        onChange={(e) => setNote(e.target.value.slice(0, 60))}
        placeholder="Ajouter un message…"
        className="mt-2 w-full flex-none rounded-full border border-line bg-white px-5 py-3 text-center text-base text-ink placeholder:text-faint focus:border-ink/30 focus:outline-none"
      />

      {/* Pavé numérique */}
      <div className="mt-3 flex-none">
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
        {contact && cents > 0 ? `Envoyer ${formatEUR(cents)} à ${firstName(contact.name)}` : "Envoyer"}
      </motion.button>
    </div>
  );
}

function FavoriteContact({
  contact,
  active,
  onSelect,
}: {
  contact: Contact;
  active: boolean;
  onSelect: () => void;
}) {
  return (
    <button onClick={onSelect} className="flex w-[62px] shrink-0 snap-start flex-col items-center gap-1.5">
      <motion.div
        whileTap={{ scale: 0.9 }}
        animate={active ? { scale: 1.07 } : { scale: 1 }}
        className={cn("rounded-full p-[2.5px] transition-colors", active ? "bg-ink" : "bg-transparent")}
      >
        <ContactAvatar name={contact.name} color={contact.color} size={52} className="bg-white" />
      </motion.div>
      <span className={cn("max-w-full truncate text-[11px]", active ? "font-bold text-ink" : "text-mut")}>
        {firstName(contact.name)}
      </span>
    </button>
  );
}

interface OverlayProps {
  stage: Stage;
  contact: Contact | null;
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
          <span className="font-semibold text-ink">{p.contact?.name}</span>
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
          {p.contact && <ContactAvatar name={p.contact.name} color={p.contact.color} size={64} />}
          <div className="mt-3 font-display text-base font-semibold text-ink">{p.contact?.name}</div>
          <div className="text-xs text-mut">{p.contact?.handle}</div>
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
