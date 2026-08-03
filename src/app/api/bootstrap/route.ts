import { NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { users, accounts, transactions, loans } from "@/db/schema";
import type { BankUser, BootstrapData } from "@/lib/types";
import { getSessionUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

const HOUR = 3600_000;
const DAY = 24 * HOUR;

function typeRank(type: string): number {
  return type === "courant" ? 0 : type === "epargne" ? 1 : 2;
}

/** Hash déterministe d'une chaîne → variation stable du seed par utilisateur. */
function hashStr(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Données de démonstration personnalisées, insérées au premier chargement d'un utilisateur. */
async function seed(userId: string, displayName: string) {
  const factor = 1 + ((hashStr(userId) % 60) - 30) / 100; // 0,70 → 1,29
  const scale = (cents: number) => Math.round(cents * factor);
  const first = displayName.split(/\s+/)[0] ?? displayName;

  const [courant, epargne, livret] = await db
    .insert(accounts)
    .values([
      { userId, name: "Compte Courant", type: "courant", balanceCents: scale(284_732), color: "#D7FF3E", last4: "4021" },
      { userId, name: "Épargne", type: "epargne", balanceCents: scale(1_254_000), color: "#8B7CFF", last4: "8810" },
      { userId, name: "Livret A", type: "livret", balanceCents: scale(510_218), color: "#5AD8C2", last4: "3342" },
    ])
    .returning();

  const now = Date.now();

  await db.insert(transactions).values([
    { accountId: courant.id, kind: "payment", label: "Boulangerie Paul", category: "Alimentation", amountCents: scale(-480), createdAt: new Date(now - 2 * HOUR) },
    { accountId: courant.id, kind: "receive", label: "Remboursement de Thomas", category: "Remboursement", amountCents: scale(2500), note: "Resto d'hier", createdAt: new Date(now - 9 * HOUR) },
    { accountId: courant.id, kind: "payment", label: "Netflix", category: "Abonnements", amountCents: scale(-1349), createdAt: new Date(now - 1 * DAY) },
    { accountId: courant.id, kind: "payment", label: "SNCF Connect", category: "Transport", amountCents: scale(-3210), createdAt: new Date(now - 1 * DAY - 5 * HOUR) },
    { accountId: courant.id, kind: "receive", label: `Salaire — ${first}`, category: "Salaire", amountCents: scale(385000), createdAt: new Date(now - 2 * DAY) },
    { accountId: courant.id, kind: "transfer", label: "Vers Épargne", category: "Transfert", amountCents: scale(-20000), createdAt: new Date(now - 2 * DAY - 3 * HOUR) },
    { accountId: courant.id, kind: "payment", label: "Franprix", category: "Courses", amountCents: scale(-4620), createdAt: new Date(now - 3 * DAY) },
    { accountId: courant.id, kind: "payment", label: "Café de Flore", category: "Restaurants", amountCents: scale(-1250), createdAt: new Date(now - 3 * DAY - 6 * HOUR) },
    { accountId: courant.id, kind: "payment", label: "Orange", category: "Factures", amountCents: scale(-2999), createdAt: new Date(now - 4 * DAY) },
    { accountId: courant.id, kind: "send", label: "Envoi à Camille", category: "Transfert", amountCents: scale(-4000), note: "Cadeau d'anniversaire", createdAt: new Date(now - 5 * DAY) },
    { accountId: courant.id, kind: "payment", label: "Vinted", category: "Shopping", amountCents: scale(-2400), createdAt: new Date(now - 6 * DAY) },
    { accountId: courant.id, kind: "payment", label: "Pharmacie Centre", category: "Santé", amountCents: scale(-870), createdAt: new Date(now - 7 * DAY) },
    { accountId: courant.id, kind: "payment", label: "UGC Ciné Cité", category: "Loisirs", amountCents: scale(-1150), createdAt: new Date(now - 8 * DAY) },
    { accountId: courant.id, kind: "payment", label: "Spotify", category: "Abonnements", amountCents: scale(-1099), createdAt: new Date(now - 9 * DAY) },
  ]);
}

export async function GET() {
  try {
    const session: BankUser | null = await getSessionUser();
    if (!session) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

    let acc = await db.select().from(accounts).where(eq(accounts.userId, session.id)).orderBy(accounts.createdAt);
    if (acc.length === 0) {
      await seed(session.id, session.name);
      acc = await db.select().from(accounts).where(eq(accounts.userId, session.id)).orderBy(accounts.createdAt);
    }

    const [tx, loanRows] = await Promise.all([
      db
        .select()
        .from(transactions)
        .where(eq(accounts.userId, session.id))
        .innerJoin(accounts, eq(transactions.accountId, accounts.id))
        .orderBy(desc(transactions.createdAt)),
      db.select().from(loans).where(eq(loans.userId, session.id)).orderBy(desc(loans.createdAt)),
    ]);
    acc.sort((x, y) => typeRank(x.type) - typeRank(y.type));

    const data: BootstrapData = {
      user: { id: session.id, name: session.name, email: session.email },
      accounts: acc.map((a) => ({
        id: a.id,
        name: a.name,
        type: a.type as BootstrapData["accounts"][number]["type"],
        balanceCents: a.balanceCents,
        color: a.color,
        last4: a.last4,
      })),
      transactions: tx.map((t) => ({
        id: t.transactions.id,
        kind: t.transactions.kind as BootstrapData["transactions"][number]["kind"],
        label: t.transactions.label,
        category: t.transactions.category,
        amountCents: t.transactions.amountCents,
        contactId: t.transactions.contactId,
        note: t.transactions.note,
        createdAt: t.transactions.createdAt.toISOString(),
      })),
      loans: loanRows.map((l) => ({
        id: l.id,
        label: l.label,
        amountCents: l.amountCents,
        remainingCents: l.remainingCents,
        ratePercent: l.ratePercent,
        termMonths: l.termMonths,
        monthlyPaymentCents: l.monthlyPaymentCents,
        status: l.status as BootstrapData["loans"][number]["status"],
        createdAt: l.createdAt.toISOString(),
      })),
    };

    return NextResponse.json(data);
  } catch (error) {
    console.error("bootstrap error", error);
    return NextResponse.json({ error: "Impossible de charger les données" }, { status: 500 });
  }
}
