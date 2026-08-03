import { pgTable, uuid, text, integer, timestamp, boolean } from "drizzle-orm/pg-core";

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
  contactUserId: uuid("contact_user_id")
    .notNull()
    .references(() => users.id),
  favorite: boolean("favorite").notNull().default(false),
  name: text("name").notNull(),
  email: text("email").notNull(),
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

export const loans = pgTable("loans", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id),
  accountId: uuid("account_id").references(() => accounts.id),
  label: text("label").notNull().default("Prêt personnel"),
  amountCents: integer("amount_cents").notNull(),
  remainingCents: integer("remaining_cents").notNull(),
  ratePercent: integer("rate_percent").notNull().default(5),
  termMonths: integer("term_months").notNull().default(12),
  monthlyPaymentCents: integer("monthly_payment_cents").notNull(),
  status: text("status").notNull().default("active"), // active | repaid
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});
