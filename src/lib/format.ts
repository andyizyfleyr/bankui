const eur = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "EUR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** Formate des centimes en euros fr-FR (ex : 2 847,32 €). */
export function formatEUR(cents: number): string {
  return eur.format(cents / 100).replace(/\u202f/g, "\u00a0");
}

/** Format court : sans décimales quand le montant est rond (ex : 1 000 €). */
export function formatEURShort(cents: number): string {
  const s = formatEUR(cents);
  return cents % 100 === 0 ? s.replace(/,\d{2}\s*/, "") : s;
}

/** Initiales à partir d'un nom complet. */
export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

/** Prénom (premier mot). */
export function firstName(name: string): string {
  return name.split(/\s+/)[0] ?? name;
}

/** Étiquette de date groupée : Aujourd'hui / Hier / date complète. */
export function dayLabel(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const startOfDay = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diff = startOfDay(now) - startOfDay(d);
  if (diff === 0) return "Aujourd'hui";
  if (diff === 86400000) return "Hier";
  return d.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
}

export function timeLabel(iso: string): string {
  return new Date(iso).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}

/** Convertit une chaîne de chiffres (euros entiers) en nombre de centimes borné. */
export function digitsToCents(digits: string): number {
  const n = parseInt(digits || "0", 10);
  if (Number.isNaN(n)) return 0;
  return Math.min(n, 9_999_999) * 100;
}

export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}
