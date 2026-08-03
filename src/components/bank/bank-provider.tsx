"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { Account, BankUser, BootstrapData, Contact, Loan, Transaction } from "@/lib/types";
import type { WithdrawProvider } from "@/lib/withdraw";

interface OpResult {
  ok: boolean;
  error?: string;
}

interface BankContextValue {
  ready: boolean;
  user: BankUser | null;
  accounts: Account[];
  contacts: Contact[];
  transactions: Transaction[];
  loans: Loan[];
  primary: Account | null;
  hidden: boolean;
  toggleHidden: () => void;
  transferOpen: boolean;
  openTransfer: () => void;
  closeTransfer: () => void;
  sendMoney: (contactId: string, amountCents: number, note?: string) => Promise<OpResult>;
  makeTransfer: (fromId: string, toId: string, amountCents: number) => Promise<OpResult>;
  addAccount: (name: string, type: Account["type"], balanceCents: number) => Promise<OpResult>;
  requestLoan: (amountCents: number, termMonths: number, accountId?: string) => Promise<OpResult>;
  withdraw: (provider: WithdrawProvider, identifier: string, amountCents: number) => Promise<OpResult>;
}

const BankContext = createContext<BankContextValue | null>(null);

export function useBank(): BankContextValue {
  const ctx = useContext(BankContext);
  if (!ctx) throw new Error("useBank doit être utilisé dans BankProvider");
  return ctx;
}

export function BankProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState<BankUser | null>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [hidden, setHidden] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);
  const snapshot = useRef<{ accounts: Account[]; transactions: Transaction[] } | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/bootstrap")
      .then((r) => {
        if (r.status === 401) {
          router.replace("/login");
          return null;
        }
        return r.json();
      })
      .then((data: BootstrapData | null) => {
        if (cancelled || !data) return;
        setUser(data.user);
        setAccounts(data.accounts);
        setContacts(data.contacts);
        setTransactions(data.transactions);
        setLoans(data.loans ?? []);
        try {
          if (localStorage.getItem(`nova:hidden:${data.user.id}`) === "1") setHidden(true);
        } catch {}
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, [router]);

  const toggleHidden = useCallback(() => {
    setHidden((h) => {
      if (user) {
        try {
          localStorage.setItem(`nova:hidden:${user.id}`, h ? "0" : "1");
        } catch {}
      }
      return !h;
    });
  }, [user]);

  const reconcile = useCallback(async (res: Response): Promise<OpResult> => {
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      if (snapshot.current) {
        setAccounts(snapshot.current.accounts);
        setTransactions(snapshot.current.transactions);
      }
      return { ok: false, error: typeof data.error === "string" ? data.error : "Erreur réseau" };
    }
    if (Array.isArray(data.accounts)) setAccounts(data.accounts);
    if (Array.isArray(data.transactions)) setTransactions(data.transactions);
    if (Array.isArray(data.loans)) setLoans(data.loans);
    return { ok: true };
  }, []);

  const addAccount = useCallback(
    async (name: string, type: Account["type"], balanceCents: number): Promise<OpResult> => {
      try {
        const res = await fetch("/api/accounts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, type, balanceCents }),
        });
        return await reconcile(res);
      } catch {
        return { ok: false, error: "Connexion impossible" };
      }
    },
    [reconcile]
  );

  const requestLoan = useCallback(
    async (amountCents: number, termMonths: number, accountId?: string): Promise<OpResult> => {
      try {
        const res = await fetch("/api/loans", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ amountCents, termMonths, accountId }),
        });
        return await reconcile(res);
      } catch {
        return { ok: false, error: "Connexion impossible" };
      }
    },
    [reconcile]
  );

  const withdraw = useCallback(
    async (provider: WithdrawProvider, identifier: string, amountCents: number): Promise<OpResult> => {
      try {
        const res = await fetch("/api/withdraw", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ provider, identifier, amountCents }),
        });
        return await reconcile(res);
      } catch {
        return { ok: false, error: "Connexion impossible" };
      }
    },
    [reconcile]
  );

  const sendMoney = useCallback(
    async (contactId: string, amountCents: number, note?: string): Promise<OpResult> => {
      const from = accounts.find((a) => a.type === "courant");
      const contact = contacts.find((c) => c.id === contactId);
      if (!from || !contact) return { ok: false, error: "Données manquantes" };

      snapshot.current = { accounts, transactions };
      const optimistic: Transaction = {
        id: `opt-${Date.now()}`,
        kind: "send",
        label: contact.name,
        category: "Transfert",
        amountCents: -amountCents,
        contactId,
        note: note || null,
        createdAt: new Date().toISOString(),
      };
      setAccounts((prev) => prev.map((a) => (a.id === from.id ? { ...a, balanceCents: a.balanceCents - amountCents } : a)));
      setTransactions((prev) => [optimistic, ...prev]);

      try {
        const res = await fetch("/api/transactions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ kind: "send", contactId, fromAccountId: from.id, amountCents, note }),
        });
        return await reconcile(res);
      } catch {
        if (snapshot.current) {
          setAccounts(snapshot.current.accounts);
          setTransactions(snapshot.current.transactions);
        }
        return { ok: false, error: "Connexion impossible" };
      }
    },
    [accounts, contacts, transactions, reconcile]
  );

  const makeTransfer = useCallback(
    async (fromId: string, toId: string, amountCents: number): Promise<OpResult> => {
      const to = accounts.find((a) => a.id === toId);
      if (!to) return { ok: false, error: "Compte introuvable" };

      snapshot.current = { accounts, transactions };
      const optimistic: Transaction = {
        id: `opt-${Date.now()}`,
        kind: "transfer",
        label: `Vers ${to.name}`,
        category: "Transfert",
        amountCents: -amountCents,
        contactId: null,
        note: null,
        createdAt: new Date().toISOString(),
      };
      setAccounts((prev) =>
        prev.map((a) =>
          a.id === fromId
            ? { ...a, balanceCents: a.balanceCents - amountCents }
            : a.id === toId
              ? { ...a, balanceCents: a.balanceCents + amountCents }
              : a
        )
      );
      setTransactions((prev) => [optimistic, ...prev]);

      try {
        const res = await fetch("/api/transactions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ kind: "transfer", fromAccountId: fromId, toAccountId: toId, amountCents }),
        });
        return await reconcile(res);
      } catch {
        if (snapshot.current) {
          setAccounts(snapshot.current.accounts);
          setTransactions(snapshot.current.transactions);
        }
        return { ok: false, error: "Connexion impossible" };
      }
    },
    [accounts, transactions, reconcile]
  );

  const value = useMemo<BankContextValue>(
    () => ({
      ready,
      user,
      accounts,
      contacts,
      transactions,
      loans,
      primary: accounts.find((a) => a.type === "courant") ?? accounts[0] ?? null,
      hidden,
      toggleHidden,
      transferOpen,
      openTransfer: () => setTransferOpen(true),
      closeTransfer: () => setTransferOpen(false),
      sendMoney,
      makeTransfer,
      addAccount,
      requestLoan,
      withdraw,
    }),
    [ready, user, accounts, contacts, transactions, loans, hidden, toggleHidden, transferOpen, sendMoney, makeTransfer, addAccount, requestLoan, withdraw]
  );

  return <BankContext.Provider value={value}>{children}</BankContext.Provider>;
}
