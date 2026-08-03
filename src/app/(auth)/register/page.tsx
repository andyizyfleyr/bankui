"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent, type ReactNode } from "react";
import { motion } from "framer-motion";
import { Eye, EyeOff, Loader2, LockKeyhole, Mail, ShieldCheck, UserRound } from "lucide-react";
import { NovaLogo } from "@/components/bank/nova-logo";
import { authRequest } from "@/lib/auth-client";

const fadeUp = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
};

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const valid = name.trim().length >= 2 && email.includes("@") && password.length >= 6;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!valid || busy) return;
    setBusy(true);
    setError(null);
    const res = await authRequest("/api/auth/register", { name, email, password });
    setBusy(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    router.push("/");
  };

  const strength = Math.min(3, Math.floor(password.length / 4) + (/\d/.test(password) ? 1 : 0));

  return (
    <div className="no-scrollbar min-h-full overflow-y-auto px-6 pb-10 pt-12">
      {/* Marque */}
      <motion.div {...fadeUp} transition={{ duration: 0.45 }} className="flex items-center justify-center gap-2.5">
        <NovaLogo size={50} />
        <span className="font-display text-[26px] font-bold tracking-tight text-ink">Nova</span>
      </motion.div>

      {/* Titre */}
      <motion.div {...fadeUp} transition={{ duration: 0.45, delay: 0.06 }} className="mt-9 text-center">
        <h1 className="font-display text-[28px] font-semibold tracking-tight text-ink">Créer un compte</h1>
        <p className="mt-1.5 text-sm text-mut">Rejoignez Nova en quelques secondes</p>
      </motion.div>

      {/* Formulaire */}
      <motion.form
        {...fadeUp}
        transition={{ duration: 0.45, delay: 0.12 }}
        onSubmit={submit}
        className="card-shadow mt-7 rounded-[28px] bg-white p-5"
      >
        <Field label="Nom complet">
          <div className="relative">
            <UserRound className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-faint" />
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Léa Moreau"
              autoComplete="name"
              className="w-full rounded-2xl border border-line bg-paper/60 py-3.5 pl-12 pr-4 text-base text-ink placeholder:text-faint focus:border-ink/30 focus:outline-none"
            />
          </div>
        </Field>

        <div className="mt-4">
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
        </div>

        <div className="mt-4">
          <Field label="Mot de passe">
            <div className="relative">
              <LockKeyhole className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-faint" />
              <input
                type={show ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="6 caractères minimum"
                autoComplete="new-password"
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
          {/* Force du mot de passe */}
          <div className="mt-2.5 flex items-center gap-2">
            <div className="flex flex-1 gap-1">
              {[0, 1, 2].map((i) => (
                <motion.span
                  key={i}
                  animate={{ backgroundColor: i < strength ? "var(--color-mint)" : "rgba(11,15,20,0.08)" }}
                  className="h-1 flex-1 rounded-full"
                />
              ))}
            </div>
            <span className="text-[11px] font-medium text-mut">
              {strength === 0 ? "Faible" : strength === 1 ? "Moyen" : strength === 2 ? "Bon" : "Excellent"}
            </span>
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
              Création…
            </>
          ) : (
            "Créer mon compte"
          )}
        </motion.button>

        <p className="mt-4 text-center text-[11px] leading-relaxed text-faint">
          En continuant, vous acceptez les{" "}
          <span className="font-semibold text-mut">Conditions d&apos;utilisation</span> et la{" "}
          <span className="font-semibold text-mut">Politique de confidentialité</span>
        </p>
      </motion.form>

      {/* Lien connexion */}
      <motion.p {...fadeUp} transition={{ duration: 0.45, delay: 0.28 }} className="mt-9 text-center text-sm text-mut">
        Déjà un compte ?{" "}
        <Link href="/login" className="font-bold text-ink">
          Se connecter
        </Link>
      </motion.p>

      <motion.p
        {...fadeUp}
        transition={{ duration: 0.45, delay: 0.34 }}
        className="mt-8 flex items-center justify-center gap-1.5 text-center text-[11px] text-faint"
      >
        <ShieldCheck className="h-3 w-3" />
        Protégé par la banque de France
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
