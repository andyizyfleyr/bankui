import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { accounts } from "@/db/schema";
import type { BankUser } from "@/lib/types";
import { getSessionUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

const TYPES = ["courant", "epargne", "livret"] as const;
const COLORS = ["#D7FF3E", "#8B7CFF", "#5AD8C2", "#FF8A5C", "#6BA8FF", "#E4C05A", "#FB7185"];

function randomLast4(): string {
  return String(Math.floor(1000 + Math.random() * 9000));
}

export async function POST(request: Request) {
  try {
    const session: BankUser | null = await getSessionUser();
    if (!session) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

    const body = (await request.json().catch(() => null)) as {
      name?: string;
      type?: string;
      balanceCents?: number;
    } | null;
    if (!body) return NextResponse.json({ error: "Requête invalide" }, { status: 400 });

    const name = String(body.name ?? "").trim().slice(0, 40);
    const type = TYPES.includes(body.type as never) ? (body.type as (typeof TYPES)[number]) : "courant";
    const balanceCents = Math.max(0, Math.round(Number(body.balanceCents) || 0));

    if (name.length < 2) return NextResponse.json({ error: "Nom de compte invalide" }, { status: 400 });

    const color = COLORS[Math.floor(Math.random() * COLORS.length)];

    await db.insert(accounts).values({ userId: session.id, name, type, balanceCents, color, last4: randomLast4() });

    const all = await db.select().from(accounts).where(eq(accounts.userId, session.id)).orderBy(accounts.createdAt);
    return NextResponse.json({
      accounts: all.map((a) => ({
        id: a.id,
        name: a.name,
        type: a.type,
        balanceCents: a.balanceCents,
        color: a.color,
        last4: a.last4,
      })),
    });
  } catch (error) {
    console.error("account error", error);
    return NextResponse.json({ error: "Une erreur est survenue" }, { status: 500 });
  }
}
