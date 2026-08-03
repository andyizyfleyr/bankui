"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { Account, BankUser, BootstrapData, Contact, Loan, SearchUser, Transaction } from "@/lib/types";
import type { WithdrawProvider } from "@/lib/withdraw";

interface OpResult {
  ok: boolean;
  error?: string;
}

interface BankContextValue {
  ready: boolean;
  user: BankUser | null;
  accounts: Account[];
  transactions: Transaction[];
  loans: Loan[];
  primary: Account | null;
  hidden: boolean;
  toggleHidden: () => void;
  transferOpen: boolean;
  openTransfer: () => void;
  closeTransfer: () => void;
  searchUsers: (q: string) => Promise<SearchUser[]>;
  sendMoney: (email: string, name: string, amountCents: number, note?: string) => Promise<OpResult>;
  makeTransfer: (fromId: string, toId: string, amountCents: number) => Promise<OpResult>;
  addAccount: (name: string, type: Account["type"], balanceCents: number) => Promise<OpResult>;
  requestLoan: (amountCents: number, termMonths: number, accountId?: string) => Promise<OpResult>;
  withdraw: (provider: WithdrawProvider, identifier: string, amountCents: number) => Promise<OpResult>;
  contacts: Contact[];
  addContact: (email: string, favorite: boolean) => Promise<OpResult>;
  setContactFavorite: (id: string, favorite: boolean) => Promise<OpResult>;
  removeContact: (id: string) => Promise<OpResult>;
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
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
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
        setTransactions(data.transactions);
        setLoans(data.loans ?? []);
        setContacts(data.contacts ?? []);
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

  const searchUsers = useCallback(async (q: string): Promise<SearchUser[]> => {
    if (!q.trim()) return [];
    try {
      const res = await fetch(`/api/users?q=${encodeURIComponent(q.trim())}`);
      if (!res.ok) return [];
      const data = await res.json();
      return Array.isArray(data.users) ? data.users : [];
    } catch {
      return [];
    }
  }, []);

  const addContact = useCallback(async (email: string, favorite: boolean): Promise<OpResult> => {
    try {
      const res = await fetch("/api/contacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, favorite }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        return { ok: false, error: typeof data.error === "string" ? data.error : "Erreur réseau" };
      }
      if (data.contact) setContacts((prev) => [data.contact, ...prev]);
      return { ok: true };
    } catch {
      return { ok: false, error: "Connexion impossible" };
    }
  }, []);

  const setContactFavorite = useCallback(async (id: string, favorite: boolean): Promise<OpResult> => {
    try {
      const res = await fetch("/api/contacts", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, favorite }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        return { ok: false, error: typeof data.error === "string" ? data.error : "Erreur réseau" };
      }
      if (data.contact) {
        setContacts((prev) => prev.map((c) => (c.id === data.contact.id ? { ...c, favorite: data.contact.favorite } : c)));
      }
      return { ok: true };
    } catch {
      return { ok: false, error: "Connexion impossible" };
    }
  }, []);

  const removeContact = useCallback(async (id: string): Promise<OpResult> => {
    try {
      const res = await fetch("/api/contacts", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        return { ok: false, error: typeof data.error === "string" ? data.error : "Erreur réseau" };
      }
      setContacts((prev) => prev.filter((c) => c.id !== id));
      return { ok: true };
    } catch {
      return { ok: false, error: "Connexion impossible" };
    }
  }, []);

  const sendMoney = useCallback(
    async (email: string, name: string, amountCents: number, note?: string): Promise<OpResult> => {
      const from = accounts.find((a) => a.type === "courant");
      if (!from) return { ok: false, error: "Données manquantes" };

      snapshot.current = { accounts, transactions };
      const optimistic: Transaction = {
        id: `opt-${Date.now()}`,
        kind: "send",
        label: name,
        category: "Transfert",
        amountCents: -amountCents,
        contactId: null,
        note: note || null,
        createdAt: new Date().toISOString(),
      };
      setAccounts((prev) => prev.map((a) => (a.id === from.id ? { ...a, balanceCents: a.balanceCents - amountCents } : a)));
      setTransactions((prev) => [optimistic, ...prev]);

      try {
        const res = await fetch("/api/transactions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ kind: "send", email, fromAccountId: from.id, amountCents, note }),
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
      transactions,
      loans,
      primary: accounts.find((a) => a.type === "courant") ?? accounts[0] ?? null,
      hidden,
      toggleHidden,
      transferOpen,
      openTransfer: () => setTransferOpen(true),
      closeTransfer: () => setTransferOpen(false),
      searchUsers,
      sendMoney,
      makeTransfer,
      addAccount,
      requestLoan,
      withdraw,
      contacts,
      addContact,
      setContactFavorite,
      removeContact,
    }),
    [ready, user, accounts, transactions, loans, hidden, toggleHidden, transferOpen, searchUsers, sendMoney, makeTransfer, addAccount, requestLoan, withdraw, contacts, addContact, setContactFavorite, removeContact]
  );

  return <BankContext.Provider value={value}>{children}</BankContext.Provider>;
}
