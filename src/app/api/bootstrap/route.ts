import { NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { accounts, transactions, loans, contacts } from "@/db/schema";
import type { BankUser, BootstrapData } from "@/lib/types";
import { getSessionUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

function typeRank(type: string): number {
  return type === "courant" ? 0 : type === "epargne" ? 1 : 2;
}

export async function GET() {
  try {
    const session: BankUser | null = await getSessionUser();
    if (!session) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

    const acc = await db.select().from(accounts).where(eq(accounts.userId, session.id)).orderBy(accounts.createdAt);

    const [tx, loanRows, contactRows] = await Promise.all([
      db
        .select()
        .from(transactions)
        .where(eq(accounts.userId, session.id))
        .innerJoin(accounts, eq(transactions.accountId, accounts.id))
        .orderBy(desc(transactions.createdAt)),
      db.select().from(loans).where(eq(loans.userId, session.id)).orderBy(desc(loans.createdAt)),
      db.select().from(contacts).where(eq(contacts.userId, session.id)).orderBy(contacts.createdAt),
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
      contacts: contactRows.map((c) => ({
        id: c.id,
        contactUserId: c.contactUserId,
        name: c.name,
        email: c.email,
        color: c.color,
        favorite: c.favorite,
      })),
    };

    return NextResponse.json(data);
  } catch (error) {
    console.error("bootstrap error", error);
    return NextResponse.json({ error: "Impossible de charger les données" }, { status: 500 });
  }
}
