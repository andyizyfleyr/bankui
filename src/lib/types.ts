export interface BankUser {
  id: string;
  name: string;
  email: string;
}

export interface Account {
  id: string;
  name: string;
  type: "courant" | "epargne" | "livret";
  balanceCents: number;
  color: string;
  last4: string;
}

export interface Contact {
  id: string;
  name: string;
  handle: string;
  color: string;
}

export type TxKind = "send" | "receive" | "transfer" | "payment" | "withdraw";

export interface Transaction {
  id: string;
  kind: TxKind;
  label: string;
  category: string;
  amountCents: number;
  contactId: string | null;
  note: string | null;
  createdAt: string;
}

export interface Loan {
  id: string;
  label: string;
  amountCents: number;
  remainingCents: number;
  ratePercent: number;
  termMonths: number;
  monthlyPaymentCents: number;
  status: "active" | "repaid";
  createdAt: string;
}

export interface BootstrapData {
  user: BankUser;
  accounts: Account[];
  contacts: Contact[];
  transactions: Transaction[];
  loans: Loan[];
}
