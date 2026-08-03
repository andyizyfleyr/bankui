import { pgTable, uuid, text, integer, timestamp } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull().default(""),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const accounts = pgTable("accounts", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id),
  name: text("name").notNull(),
  type: text("type").notNull().default("courant"),
  balanceCents: integer("balance_cents").notNull().default(0),
  color: text("color").notNull().default("#D7FF3E"),
  last4: text("last4").notNull().default("0000"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const contacts = pgTable("contacts", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id),
  name: text("name").notNull(),
  handle: text("handle").notNull(),
  color: text("color").notNull().default("#8B7CFF"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const transactions = pgTable("transactions", {
  id: uuid("id").defaultRandom().primaryKey(),
  accountId: uuid("account_id")
    .notNull()
    .references(() => accounts.id),
  contactId: uuid("contact_id").references(() => contacts.id),
  kind: text("kind").notNull().default("payment"), // send | receive | transfer | payment
  label: text("label").notNull(),
  category: text("category").notNull().default("Autre"),
  amountCents: integer("amount_cents").notNull(), // signé : négatif = débit
  note: text("note"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});
