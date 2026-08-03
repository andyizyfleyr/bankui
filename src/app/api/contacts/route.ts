import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { contacts, users } from "@/db/schema";
import type { BankUser } from "@/lib/types";
import { getSessionUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

const COLORS = ["#D7FF3E", "#8B7CFF", "#5AD8C2", "#FF8A5C", "#6BA8FF", "#E4C05A", "#FB7185"];

function serialized(c: { id: string; contactUserId: string; name: string; email: string; color: string; favorite: boolean }) {
  return {
    id: c.id,
    contactUserId: c.contactUserId,
    name: c.name,
    email: c.email,
    color: c.color,
    favorite: c.favorite,
  };
}

export async function GET() {
  const session: BankUser | null = await getSessionUser();
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const rows = await db
    .select()
    .from(contacts)
    .where(eq(contacts.userId, session.id))
    .orderBy(contacts.createdAt);

  return NextResponse.json({ contacts: rows.map(serialized) });
}

export async function POST(req: Request) {
  try {
    const session: BankUser | null = await getSessionUser();
    if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

    const body = (await req.json()) as { email?: string; userId?: string; favorite?: boolean };
    const favorite = Boolean(body.favorite);

    let targetId: string | null = null;
    if (body.userId) {
      targetId = body.userId;
    } else {
      const email = (body.email ?? "").trim().toLowerCase();
      if (!email || !email.includes("@")) {
        return NextResponse.json({ error: "Adresse email invalide" }, { status: 400 });
      }
      const [u] = await db.select().from(users).where(eq(users.email, email)).limit(1);
      if (!u) return NextResponse.json({ error: "Aucun utilisateur avec cet email" }, { status: 404 });
      targetId = u.id;
    }

    if (!targetId) return NextResponse.json({ error: "Destinataire invalide" }, { status: 400 });
    if (targetId === session.id) {
      return NextResponse.json({ error: "Impossible de s'ajouter soi-même" }, { status: 400 });
    }

    const [target] = await db.select().from(users).where(eq(users.id, targetId)).limit(1);
    if (!target) return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });

    const [existing] = await db
      .select()
      .from(contacts)
      .where(and(eq(contacts.userId, session.id), eq(contacts.contactUserId, targetId)))
      .limit(1);
    if (existing) {
      return NextResponse.json({ error: "Ce contact existe déjà" }, { status: 409 });
    }

    const color = COLORS[(target.name.charCodeAt(0) + target.name.length) % COLORS.length];
    const [inserted] = await db
      .insert(contacts)
      .values({
        userId: session.id,
        contactUserId: target.id,
        name: target.name,
        email: target.email,
        color,
        favorite,
      })
      .returning();

    return NextResponse.json({ contact: serialized(inserted) }, { status: 201 });
  } catch (error) {
    console.error("contacts POST error", error);
    return NextResponse.json({ error: "Une erreur est survenue" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const session: BankUser | null = await getSessionUser();
    if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

    const body = (await req.json()) as { id?: string; favorite?: boolean };
    const favorite = Boolean(body.favorite);
    if (!body.id) return NextResponse.json({ error: "Contact manquant" }, { status: 400 });

    const [updated] = await db
      .update(contacts)
      .set({ favorite })
      .where(and(eq(contacts.id, body.id), eq(contacts.userId, session.id)))
      .returning();
    if (!updated) return NextResponse.json({ error: "Contact introuvable" }, { status: 404 });

    return NextResponse.json({ contact: serialized(updated) });
  } catch (error) {
    console.error("contacts PATCH error", error);
    return NextResponse.json({ error: "Une erreur est survenue" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const session: BankUser | null = await getSessionUser();
    if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

    const body = (await req.json()) as { id?: string };
    if (!body.id) return NextResponse.json({ error: "Contact manquant" }, { status: 400 });

    const rows = await db
      .delete(contacts)
      .where(and(eq(contacts.id, body.id), eq(contacts.userId, session.id)))
      .returning({ id: contacts.id });
    if (rows.length === 0) return NextResponse.json({ error: "Contact introuvable" }, { status: 404 });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("contacts DELETE error", error);
    return NextResponse.json({ error: "Une erreur est survenue" }, { status: 500 });
  }
}

export function OPTIONS() {
  return NextResponse.json({}, { headers: { Allow: "GET, POST, PATCH, DELETE, OPTIONS" } });
}
