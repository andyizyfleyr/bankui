import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import type { BankUser } from "@/lib/types";
import { createSession, hashPassword } from "@/lib/auth";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { name?: string; email?: string; password?: string };
    const name = String(body.name ?? "").trim().slice(0, 80);
    const email = String(body.email ?? "").trim().toLowerCase();
    const password = String(body.password ?? "");

    if (name.length < 2) return NextResponse.json({ error: "Nom invalide" }, { status: 400 });
    if (!EMAIL_RE.test(email)) return NextResponse.json({ error: "E-mail invalide" }, { status: 400 });
    if (password.length < 6) {
      return NextResponse.json({ error: "Mot de passe trop court (6 caractères minimum)" }, { status: 400 });
    }

    const existing = await db.select().from(users).where(eq(users.email, email)).limit(1);
    if (existing.length > 0) {
      return NextResponse.json({ error: "Un compte existe déjà avec cet e-mail" }, { status: 409 });
    }

    const passwordHash = await hashPassword(password);
    const [user] = await db.insert(users).values({ name, email, passwordHash }).returning();
    const safe: BankUser = { id: user.id, name: user.name, email: user.email };

    await createSession(safe);
    return NextResponse.json({ user: safe });
  } catch (error) {
    console.error("register error", error);
    return NextResponse.json({ error: "Erreur lors de l'inscription" }, { status: 500 });
  }
}
