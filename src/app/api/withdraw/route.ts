import { NextResponse } from "next/server";
import { desc, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import { accounts, transactions } from "@/db/schema";
import type { BankUser } from "@/lib/types";
import { getSessionUser } from "@/lib/auth";
import {
  WITHDRAW_MAX_CENTS,
  WITHDRAW_MIN_CENTS,
  WITHDRAW_PROVIDERS,
  withdrawFeeCents,
  type WithdrawProvider,
} from "@/lib/withdraw";

export const dynamic = "force-dynamic";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function stateFor(userId: string) {
  const [acc, txList] = await Promise.all([
    db.select().from(accounts).where(eq(accounts.userId, userId)).orderBy(accounts.createdAt),
    db
      .select()
      .from(transactions)
      .where(inArray(transactions.accountId, (await db.select().from(accounts).where(eq(accounts.userId, userId))).map((a) => a.id)))
      .orderBy(desc(transactions.createdAt))
    ,
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
  };
}

export async function POST(request: Request) {
  try {
    const session: BankUser | null = await getSessionUser();
    if (!session) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

    const body = (await request.json().catch(() => null)) as {
      provider?: string;
      identifier?: string;
      amountCents?: number;
    } | null;
    if (!body) return NextResponse.json({ error: "Requête invalide" }, { status: 400 });

    const providerId = String(body.provider ?? "") as WithdrawProvider;
    const provider = WITHDRAW_PROVIDERS[providerId];
    if (!provider) return NextResponse.json({ error: "Fournisseur invalide" }, { status: 400 });

    const identifier = String(body.identifier ?? "").trim().slice(0, 80);
    if (identifier.length < 3) {
      return NextResponse.json({ error: "Référence du destinataire invalide" }, { status: 400 });
    }
    if (providerId === "paypal" && !EMAIL_RE.test(identifier)) {
      return NextResponse.json({ error: "E-mail PayPal invalide" }, { status: 400 });
    }

    const amountCents = Math.round(Number(body.amountCents));
    if (!Number.isFinite(amountCents) || amountCents < WITHDRAW_MIN_CENTS || amountCents > WITHDRAW_MAX_CENTS) {
      return NextResponse.json({ error: "Montant invalide (10 € à 10 000 €)" }, { status: 400 });
    }

    const feeCents = withdrawFeeCents(amountCents, provider.feePercent);
    const totalCents = amountCents + feeCents;

    const accs = await db.select().from(accounts).where(eq(accounts.userId, session.id)).orderBy(accounts.createdAt);
    const source = accs.find((a) => a.type === "courant") ?? accs[0];
    if (!source) return NextResponse.json({ error: "Aucun compte disponible" }, { status: 400 });
    if (source.balanceCents < totalCents) {
      return NextResponse.json({ error: "Solde insuffisant" }, { status: 400 });
    }

    await db.transaction(async (tx) => {
      await tx
        .update(accounts)
        .set({ balanceCents: sql`${accounts.balanceCents} - ${totalCents}` })
        .where(eq(accounts.id, source.id));
      await tx.insert(transactions).values({
        accountId: source.id,
        kind: "withdraw",
        label: `Retrait ${provider.label}`,
        category: "Retrait",
        amountCents: -totalCents,
        note: `${identifier}${feeCents > 0 ? ` · frais ${feeCents / 100} €` : ""}`,
      });
    });

    return NextResponse.json(await stateFor(session.id));
  } catch (error) {
    console.error("withdraw error", error);
    return NextResponse.json({ error: "Une erreur est survenue" }, { status: 500 });
  }
}
