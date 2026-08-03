import { NextResponse } from "next/server";
import { desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { accounts, contacts, transactions } from "@/db/schema";

export const dynamic = "force-dynamic";

function typeRank(type: string): number {
  return type === "courant" ? 0 : type === "epargne" ? 1 : 2;
}

interface Body {
  kind?: string;
  contactId?: string;
  fromAccountId?: string;
  toAccountId?: string;
  amountCents?: number;
  note?: string;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Body;
    const kind = body.kind;
    const amountCents = Math.round(Number(body.amountCents));
    const fromAccountId = body.fromAccountId;

    if (!fromAccountId || !Number.isFinite(amountCents) || amountCents <= 0) {
      return NextResponse.json({ error: "Montant invalide" }, { status: 400 });
    }

    const [from] = await db.select().from(accounts).where(eq(accounts.id, fromAccountId)).limit(1);
    if (!from) return NextResponse.json({ error: "Compte introuvable" }, { status: 404 });
    if (from.balanceCents < amountCents) {
      return NextResponse.json({ error: "Solde insuffisant" }, { status: 400 });
    }

    if (kind === "send") {
      const [contact] = await db.select().from(contacts).where(eq(contacts.id, body.contactId ?? "")).limit(1);
      if (!contact) return NextResponse.json({ error: "Destinataire introuvable" }, { status: 404 });

      await db.transaction(async (tx) => {
        await tx
          .update(accounts)
          .set({ balanceCents: sql`${accounts.balanceCents} - ${amountCents}` })
          .where(eq(accounts.id, fromAccountId));
        await tx.insert(transactions).values({
          accountId: fromAccountId,
          contactId: contact.id,
          kind: "send",
          label: contact.name,
          category: "Transfert",
          amountCents: -amountCents,
          note: body.note?.slice(0, 120) || null,
        });
      });
    } else if (kind === "transfer") {
      const toAccountId = body.toAccountId;
      if (!toAccountId || toAccountId === fromAccountId) {
        return NextResponse.json({ error: "Compte destinataire invalide" }, { status: 400 });
      }
      const [to] = await db.select().from(accounts).where(eq(accounts.id, toAccountId)).limit(1);
      if (!to) return NextResponse.json({ error: "Compte destinataire introuvable" }, { status: 404 });

      await db.transaction(async (tx) => {
        await tx
          .update(accounts)
          .set({ balanceCents: sql`${accounts.balanceCents} - ${amountCents}` })
          .where(eq(accounts.id, fromAccountId));
        await tx
          .update(accounts)
          .set({ balanceCents: sql`${accounts.balanceCents} + ${amountCents}` })
          .where(eq(accounts.id, toAccountId));
        await tx.insert(transactions).values({
          accountId: fromAccountId,
          kind: "transfer",
          label: `Vers ${to.name}`,
          category: "Transfert",
          amountCents: -amountCents,
          note: body.note?.slice(0, 120) || null,
        });
      });
    } else {
      return NextResponse.json({ error: "Type d'opération inconnu" }, { status: 400 });
    }

    const [acc, txList] = await Promise.all([
      db.select().from(accounts).orderBy(accounts.createdAt),
      db.select().from(transactions).orderBy(desc(transactions.createdAt)).limit(80),
    ]);
    acc.sort((x, y) => typeRank(x.type) - typeRank(y.type));

    return NextResponse.json({
      accounts: acc.map((a) => ({
        id: a.id,
        name: a.name,
        type: a.type,
        balanceCents: a.balanceCents,
        color: a.color,
        last4: a.last4,
      })),
      transactions: txList.map((t) => ({
        id: t.id,
        kind: t.kind,
        label: t.label,
        category: t.category,
        amountCents: t.amountCents,
        contactId: t.contactId,
        note: t.note,
        createdAt: t.createdAt.toISOString(),
      })),
    });
  } catch (error) {
    console.error("transaction error", error);
    return NextResponse.json({ error: "Une erreur est survenue" }, { status: 500 });
  }
}
