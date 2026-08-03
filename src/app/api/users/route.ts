import { NextRequest, NextResponse } from "next/server";
import { ilike, or, and, ne } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { getSessionUser } from "@/lib/auth";

export const runtime = "nodejs";

const COLORS = ["#D7FF3E", "#8B7CFF", "#5AD8C2", "#FF8A5C", "#6BA8FF", "#E4C05A", "#FB7185"];

export async function GET(req: NextRequest) {
  const session = await getSessionUser();
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const q = req.nextUrl.searchParams.get("q") ?? "";
  const clean = q.trim().slice(0, 60);
  if (!clean) return NextResponse.json({ users: [] });

  const pattern = `%${clean}%`;
  const rows = await db
    .select({ id: users.id, name: users.name, email: users.email })
    .from(users)
    .where(and(ne(users.id, session.id), or(ilike(users.name, pattern), ilike(users.email, pattern))))
    .orderBy(users.name)
    .limit(20);

  return NextResponse.json({
    users: rows.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      initials: initials(u.name),
      color: COLORS[(u.name.charCodeAt(0) + u.name.length) % COLORS.length],
    })),
  });
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("");
}
