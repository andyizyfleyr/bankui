import { NextResponse } from "next/server";
import { desc } from "drizzle-orm";
import { db } from "@/db";
import { users, accounts, contacts, transactions } from "@/db/schema";
import type { BootstrapData } from "@/lib/types";

export const dynamic = "force-dynamic";

const HOUR = 3600_000;
const DAY = 24 * HOUR;

function typeRank(type: string): number {
  return type === "courant" ? 0 : type === "epargne" ? 1 : 2;
}

/** Données de démonstration insérées au premier appel. */
async function seed() {
  const [user] = await db
    .insert(users)
    .values({ name: "Léa Moreau", email: "lea@nova.bank" })
    .returning();

  const [courant, epargne, livret] = await db
    .insert(accounts)
    .values([
      { userId: user.id, name: "Compte Courant", type: "courant", balanceCents: 284_732, color: "#D7FF3E", last4: "4021" },
      { userId: user.id, name: "Épargne", type: "epargne", balanceCents: 1_254_000, color: "#8B7CFF", last4: "8810" },
      { userId: user.id, name: "Livret A", type: "livret", balanceCents: 510_218, color: "#5AD8C2", last4: "3342" },
    ])
    .returning();

  const people = await db
    .insert(contacts)
    .values([
      { userId: user.id, name: "Camille Dupont", handle: "@camille.d", color: "#FF8A5C" },
      { userId: user.id, name: "Thomas Roche", handle: "@thomas.r", color: "#8B7CFF" },
      { userId: user.id, name: "Inès Benali", handle: "@ines.b", color: "#5AD8C2" },
      { userId: user.id, name: "Maxime Faure", handle: "@max.f", color: "#E4C05A" },
      { userId: user.id, name: "Sarah Koné", handle: "@sarah.k", color: "#FB7185" },
      { userId: user.id, name: "Antoine Lefèvre", handle: "@antoine.l", color: "#6BA8FF" },
      { userId: user.id, name: "Maman", handle: "@famille", color: "#C084FC" },
      { userId: user.id, name: "Hugo Lambert", handle: "@hugo.l", color: "#7BD88F" },
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
    let allUsers = await db.select().from(users).limit(1);
    if (allUsers.length === 0) {
      await seed();
      allUsers = await db.select().from(users).limit(1);
    }
    const user = allUsers[0];

    const [acc, ctc, tx] = await Promise.all([
      db.select().from(accounts).orderBy(accounts.createdAt),
      db.select().from(contacts).orderBy(contacts.createdAt),
      db.select().from(transactions).orderBy(desc(transactions.createdAt)).limit(80),
    ]);
    acc.sort((x, y) => typeRank(x.type) - typeRank(y.type));

    const data: BootstrapData = {
      user: { id: user.id, name: user.name, email: user.email },
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
        id: t.id,
        kind: t.kind as BootstrapData["transactions"][number]["kind"],
        label: t.label,
        category: t.category,
        amountCents: t.amountCents,
        contactId: t.contactId,
        note: t.note,
        createdAt: t.createdAt.toISOString(),
      })),
    };

    return NextResponse.json(data);
  } catch (error) {
    console.error("bootstrap error", error);
    return NextResponse.json({ error: "Impossible de charger les données" }, { status: 500 });
  }
}
