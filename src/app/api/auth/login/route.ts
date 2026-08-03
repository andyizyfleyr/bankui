import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import type { BankUser } from "@/lib/types";
import { createSession, verifyPassword } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { email?: string; password?: string };
    const email = String(body.email ?? "").trim().toLowerCase();
    const password = String(body.password ?? "");

    if (!email || !password) return NextResponse.json({ error: "E-mail et mot de passe requis" }, { status: 400 });

    const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
    const ok = user ? await verifyPassword(password, user.passwordHash) : false;
    if (!user || !ok) {
      return NextResponse.json({ error: "E-mail ou mot de passe incorrect" }, { status: 401 });
    }

    const safe: BankUser = { id: user.id, name: user.name, email: user.email };
    await createSession(safe);
    return NextResponse.json({ user: safe });
  } catch (error) {
    console.error("login error", error);
    return NextResponse.json({ error: "Erreur lors de la connexion" }, { status: 500 });
  }
}
