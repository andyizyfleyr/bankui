import { NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { users, accounts, contacts, transactions } from "@/db/schema";
import type { BankUser, BootstrapData } from "@/lib/types";
import { getSessionUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

const HOUR = 3600_000;
const DAY = 24 * HOUR;

function typeRank(type: string): number {
  return type === "courant" ? 0 : type === "epargne" ? 1 : 2;
}

/** Données de démonstration insérées au premier chargement d'un utilisateur. */
async function seed(userId: string) {
  const [courant, epargne, livret] = await db
    .insert(accounts)
    .values([
      { userId, name: "Compte Courant", type: "courant", balanceCents: 284_732, color: "#D7FF3E", last4: "4021" },
      { userId, name: "Épargne", type: "epargne", balanceCents: 1_254_000, color: "#8B7CFF", last4: "8810" },
      { userId, name: "Livret A", type: "livret", balanceCents: 510_218, color: "#5AD8C2", last4: "3342" },
    ])
    .returning();

  const people = await db
    .insert(contacts)
    .values([
      { userId, name: "Camille Dupont", handle: "@camille.d", color: "#FF8A5C" },
      { userId, name: "Thomas Roche", handle: "@thomas.r", color: "#8B7CFF" },
      { userId, name: "Inès Benali", handle: "@ines.b", color: "#5AD8C2" },
      { userId, name: "Maxime Faure", handle: "@max.f", color: "#E4C05A" },
      { userId, name: "Sarah Koné", handle: "@sarah.k", color: "#FB7185" },
      { userId, name: "Antoine Lefèvre", handle: "@antoine.l", color: "#6BA8FF" },
      { userId, name: "Maman", handle: "@famille", color: "#C084FC" },
      { userId, name: "Hugo Lambert", handle: "@hugo.l", color: "#7BD88F" },
    ])
    .returning();

  const now = Date.now();
  const [camille, thomas] = people;

  await db.insert(transactions).values([
    { accountId: courant.id, kind: "payment", label: "Boulangerie Paul", category: "Alimentation", amountCents: -480, createdAt: new Date(now - 2 * HOUR) },
    { accountId: courant.id, contactId: thomas.id, kind: "receive", label: "Thomas Roche", category: "Remboursement", amountCents: 2500, note: "Resto d'hier", createdAt: new Date(now - 9 * HOUR) },
    { accountId: courant.id, kind: "payment", label: "Netflix", category: "Abonnements", amountCents: -1349, createdAt: new Date(now - 1 * DAY) },
    { accountId: courant.id, kind: "payment", label: "SNCF Connect", category: "Transport", amountCents: -3210, createdAt: new Date(now - 1 * DAY - 5 * HOUR) },
    { accountId: courant.id, kind: "receive", label: "Salaire — Nova Studio", category: "Salaire", amountCents: 385000, createdAt: new Date(now - 2 * DAY) },
    { accountId: courant.id, kind: "transfer", label: "Vers Épargne", category: "Transfert", amountCents: -20000, createdAt: new Date(now - 2 * DAY - 3 * HOUR) },
    { accountId: courant.id, kind: "payment", label: "Franprix", category: "Courses", amountCents: -4620, createdAt: new Date(now - 3 * DAY) },
    { accountId: courant.id, kind: "payment", label: "Café de Flore", category: "Restaurants", amountCents: -1250, createdAt: new Date(now - 3 * DAY - 6 * HOUR) },
    { accountId: courant.id, kind: "payment", label: "Orange", category: "Factures", amountCents: -2999, createdAt: new Date(now - 4 * DAY) },
    { accountId: courant.id, contactId: camille.id, kind: "send", label: "Camille Dupont", category: "Transfert", amountCents: -4000, note: "Cadeau d'anniversaire", createdAt: new Date(now - 5 * DAY) },
    { accountId: courant.id, kind: "payment", label: "Vinted", category: "Shopping", amountCents: -2400, createdAt: new Date(now - 6 * DAY) },
    { accountId: courant.id, kind: "payment", label: "Pharmacie Centre", category: "Santé", amountCents: -870, createdAt: new Date(now - 7 * DAY) },
    { accountId: courant.id, kind: "payment", label: "UGC Ciné Cité", category: "Loisirs", amountCents: -1150, createdAt: new Date(now - 8 * DAY) },
    { accountId: courant.id, kind: "payment", label: "Spotify", category: "Abonnements", amountCents: -1099, createdAt: new Date(now - 9 * DAY) },
  ]);
}

export async function GET() {
  try {
    const session: BankUser | null = await getSessionUser();
    if (!session) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

    let acc = await db.select().from(accounts).where(eq(accounts.userId, session.id)).orderBy(accounts.createdAt);
    if (acc.length === 0) {
      await seed(session.id);
      acc = await db.select().from(accounts).where(eq(accounts.userId, session.id)).orderBy(accounts.createdAt);
    }

    const [ctc, tx] = await Promise.all([
      db.select().from(contacts).where(eq(contacts.userId, session.id)).orderBy(contacts.createdAt),
      db
        .select()
        .from(transactions)
        .where(eq(accounts.userId, session.id))
        .innerJoin(accounts, eq(transactions.accountId, accounts.id))
        .orderBy(desc(transactions.createdAt))
        .limit(80),
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
      contacts: ctc.map((c) => ({ id: c.id, name: c.name, handle: c.handle, color: c.color })),
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
    };

    return NextResponse.json(data);
  } catch (error) {
    console.error("bootstrap error", error);
    return NextResponse.json({ error: "Impossible de charger les données" }, { status: 500 });
  }
}
