import { NextResponse } from "next/server";
import { desc, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import { accounts, loans, transactions } from "@/db/schema";
import type { BankUser } from "@/lib/types";
import { getSessionUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

const MIN_LOAN_CENTS = 10_000;
const MAX_LOAN_CENTS = 1_000_000;
const ANNUAL_RATE_PERCENT = 5;

function monthlyPaymentCents(amountCents: number, annualRatePercent: number, termMonths: number): number {
  if (termMonths <= 0) return amountCents;
  const r = annualRatePercent / 100 / 12;
  if (r === 0) return Math.ceil(amountCents / termMonths);
  const payment = (amountCents * r) / (1 - Math.pow(1 + r, -termMonths));
  return Math.ceil(payment);
}

async function stateFor(userId: string) {
  const [acc, txList, loanRows] = await Promise.all([
    db.select().from(accounts).where(eq(accounts.userId, userId)).orderBy(accounts.createdAt),
    db
      .select()
      .from(transactions)
      .where(inArray(transactions.accountId, (await db.select().from(accounts).where(eq(accounts.userId, userId))).map((a) => a.id)))
      .orderBy(desc(transactions.createdAt))
    ,
    db.select().from(loans).where(eq(loans.userId, userId)).orderBy(desc(loans.createdAt)),
  ]);
  return {
    accounts: acc.map((a) => ({ id: a.id, name: a.name, type: a.type, balanceCents: a.balanceCents, color: a.color, last4: a.last4 })),
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
    loans: loanRows.map((l) => ({
      id: l.id,
      label: l.label,
      amountCents: l.amountCents,
      remainingCents: l.remainingCents,
      ratePercent: l.ratePercent,
      termMonths: l.termMonths,
      monthlyPaymentCents: l.monthlyPaymentCents,
      status: l.status as "active" | "repaid",
      createdAt: l.createdAt.toISOString(),
    })),
  };
}

export async function GET() {
  try {
    const session: BankUser | null = await getSessionUser();
    if (!session) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    const { loans: loanRows } = await stateFor(session.id);
    return NextResponse.json({ loans: loanRows });
  } catch (error) {
    console.error("loans error", error);
    return NextResponse.json({ error: "Une erreur est survenue" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session: BankUser | null = await getSessionUser();
    if (!session) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

    const body = (await request.json().catch(() => null)) as {
      amountCents?: number;
      termMonths?: number;
      accountId?: string;
    } | null;
    if (!body) return NextResponse.json({ error: "Requête invalide" }, { status: 400 });

    const amountCents = Math.round(Number(body.amountCents));
    const termMonths = Math.round(Number(body.termMonths));
    if (!Number.isFinite(amountCents) || amountCents < MIN_LOAN_CENTS || amountCents > MAX_LOAN_CENTS) {
      return NextResponse.json({ error: "Montant invalide (100 € à 100 000 €)" }, { status: 400 });
    }
    if (!Number.isFinite(termMonths) || termMonths < 3 || termMonths > 60) {
      return NextResponse.json({ error: "Durée invalide (3 à 60 mois)" }, { status: 400 });
    }

    let accountId = body.accountId;
    if (accountId) {
      const [acc] = await db.select().from(accounts).where(eq(accounts.id, accountId)).limit(1);
      if (!acc || acc.userId !== session.id) return NextResponse.json({ error: "Compte introuvable" }, { status: 404 });
    } else {
      const accs = await db.select().from(accounts).where(eq(accounts.userId, session.id)).orderBy(accounts.createdAt);
      const courant = accs.find((a) => a.type === "courant") ?? accs[0];
      if (!courant) return NextResponse.json({ error: "Aucun compte disponible" }, { status: 400 });
      accountId = courant.id;
    }

    const payment = monthlyPaymentCents(amountCents, ANNUAL_RATE_PERCENT, termMonths);

    await db.transaction(async (tx) => {
      await tx.update(accounts).set({ balanceCents: sql`${accounts.balanceCents} + ${amountCents}` }).where(eq(accounts.id, accountId!));
      await tx.insert(transactions).values({
        accountId: accountId!,
        kind: "receive",
        label: "Prêt Nova",
        category: "Prêt",
        amountCents,
        note: `Prêt sur ${termMonths} mois · ${payment / 100} €/mois`,
      });
      await tx.insert(loans).values({
        userId: session.id,
        accountId: accountId!,
        label: "Prêt personnel",
        amountCents,
        remainingCents: amountCents,
        ratePercent: ANNUAL_RATE_PERCENT,
        termMonths,
        monthlyPaymentCents: payment,
        status: "active",
      });
    });

    return NextResponse.json(await stateFor(session.id));
  } catch (error) {
    console.error("loan error", error);
    return NextResponse.json({ error: "Une erreur est survenue" }, { status: 500 });
  }
}
