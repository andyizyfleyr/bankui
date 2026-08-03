"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent, type ReactNode } from "react";
import { motion } from "framer-motion";
import { Eye, EyeOff, Fingerprint, Loader2, LockKeyhole, Mail, ShieldCheck } from "lucide-react";
import { NovaLogo } from "@/components/bank/nova-logo";

const fadeUp = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
};

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const valid = email.includes("@") && password.length >= 6;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!valid || busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const text = await res.text();
      let data: { error?: unknown } = {};
      try {
        data = text ? JSON.parse(text) : {};
      } catch {}
      if (!res.ok) {
        setError(
          typeof data.error === "string" && data.error
            ? data.error
            : `Erreur inattendue (code ${res.status})`
        );
        setBusy(false);
        return;
      }
      router.push("/");
    } catch {
      setError("Connexion impossible, réessayez");
      setBusy(false);
    }
  };

  return (
    <div className="no-scrollbar min-h-full overflow-y-auto px-6 pb-10 pt-12">
      {/* Marque */}
      <motion.div {...fadeUp} transition={{ duration: 0.45 }} className="flex items-center justify-center gap-2.5">
        <NovaLogo size={50} />
        <span className="font-display text-[26px] font-bold tracking-tight text-ink">Nova</span>
      </motion.div>

      {/* Titre */}
      <motion.div {...fadeUp} transition={{ duration: 0.45, delay: 0.06 }} className="mt-9 text-center">
        <h1 className="font-display text-[28px] font-semibold tracking-tight text-ink">Bon retour !</h1>
        <p className="mt-1.5 text-sm text-mut">Connectez-vous pour gérer vos comptes</p>
      </motion.div>

      {/* Formulaire */}
      <motion.form
        {...fadeUp}
        transition={{ duration: 0.45, delay: 0.12 }}
        onSubmit={submit}
        className="card-shadow mt-7 rounded-[28px] bg-white p-5"
      >
        <Field label="Adresse e-mail">
          <div className="relative">
            <Mail className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-faint" />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="vous@exemple.fr"
              autoComplete="email"
              inputMode="email"
              className="w-full rounded-2xl border border-line bg-paper/60 py-3.5 pl-12 pr-4 text-base text-ink placeholder:text-faint focus:border-ink/30 focus:outline-none"
            />
          </div>
        </Field>

        <div className="mt-4">
          <Field label="Mot de passe">
            <div className="relative">
              <LockKeyhole className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-faint" />
              <input
                type={show ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
                className="w-full rounded-2xl border border-line bg-paper/60 py-3.5 pl-12 pr-12 text-base text-ink placeholder:text-faint focus:border-ink/30 focus:outline-none"
              />
              <motion.button
                whileTap={{ scale: 0.88 }}
                type="button"
                onClick={() => setShow((s) => !s)}
                aria-label={show ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                className="absolute right-3 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-full text-mut hover:text-ink"
              >
                {show ? <EyeOff className="h-[18px] w-[18px]" /> : <Eye className="h-[18px] w-[18px]" />}
              </motion.button>
            </div>
          </Field>
          <div className="mt-1.5 flex justify-end">
            <button type="button" className="text-xs font-bold text-mint transition-colors hover:text-mint/80">
              Mot de passe oublié ?
            </button>
          </div>
        </div>

        {error && <p className="mt-3 text-center text-xs font-medium text-rose">{error}</p>}

        <motion.button
          whileTap={valid ? { scale: 0.97 } : undefined}
          type="submit"
          disabled={!valid || busy}
          className={
            valid && !busy
              ? "mt-5 flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-ink font-display text-base font-semibold text-white shadow-[0_16px_32px_-12px_rgba(11,15,20,0.5)]"
              : "mt-5 flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-ink/[0.06] font-display text-base font-semibold text-faint"
          }
        >
          {busy ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              Connexion…
            </>
          ) : (
            "Se connecter"
          )}
        </motion.button>
      </motion.form>

      {/* Séparateur + Face ID */}
      <motion.div {...fadeUp} transition={{ duration: 0.45, delay: 0.18 }} className="mt-6 flex items-center gap-3">
        <span className="h-px flex-1 bg-line" />
        <span className="text-[11px] font-semibold uppercase tracking-wider text-faint">ou</span>
        <span className="h-px flex-1 bg-line" />
      </motion.div>

      <motion.button
        {...fadeUp}
        transition={{ duration: 0.45, delay: 0.22 }}
        whileTap={{ scale: 0.97 }}
        className="card-shadow mt-4 flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-white font-display text-sm font-semibold text-ink"
      >
        <Fingerprint className="h-5 w-5 text-mint" strokeWidth={2.2} />
        Se connecter avec Face ID
      </motion.button>

      {/* Lien inscription */}
      <motion.p {...fadeUp} transition={{ duration: 0.45, delay: 0.28 }} className="mt-9 text-center text-sm text-mut">
        Pas encore de compte ?{" "}
        <Link href="/register" className="font-bold text-ink">
          Créer un compte
        </Link>
      </motion.p>

      <motion.p
        {...fadeUp}
        transition={{ duration: 0.45, delay: 0.34 }}
        className="mt-8 flex items-center justify-center gap-1.5 text-center text-[11px] text-faint"
      >
        <ShieldCheck className="h-3 w-3" />
        Vos données sont chiffrées de bout en bout
      </motion.p>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-bold uppercase tracking-[0.12em] text-mut">{label}</span>
      {children}
    </label>
  );
}
