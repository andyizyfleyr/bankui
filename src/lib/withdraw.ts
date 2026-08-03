export type WithdrawProvider = "momo" | "moov" | "paypal" | "bank";

export interface ProviderInfo {
  id: WithdrawProvider;
  label: string;
  feePercent: number;
  logo: string;
  placeholder: string;
  hint: string;
}

export const WITHDRAW_PROVIDERS: Record<WithdrawProvider, ProviderInfo> = {
  momo: {
    id: "momo",
    label: "MTN MoMo",
    feePercent: 0.5,
    logo: "/logos/mtn-momo.jpg",
    placeholder: "+225 07 XX XX XX XX",
    hint: "Instantané · frais 0,5 %",
  },
  moov: {
    id: "moov",
    label: "Moov Money",
    feePercent: 0.5,
    logo: "/logos/moov.png",
    placeholder: "+225 01 XX XX XX XX",
    hint: "Instantané · frais 0,5 %",
  },
  paypal: {
    id: "paypal",
    label: "PayPal",
    feePercent: 1.5,
    logo: "/logos/paypal.png",
    placeholder: "exemple@mail.com",
    hint: "Virement international · frais 1,5 %",
  },
  bank: {
    id: "bank",
    label: "Compte bancaire",
    feePercent: 0,
    logo: "/logos/bank.png",
    placeholder: "IBAN ou n° de compte",
    hint: "Sans frais · sous 48 h",
  },
};

export const WITHDRAW_PROVIDER_LIST = Object.values(WITHDRAW_PROVIDERS);

export const WITHDRAW_MIN_CENTS = 1_000;
export const WITHDRAW_MAX_CENTS = 1_000_000;

export function withdrawFeeCents(amountCents: number, feePercent: number): number {
  if (amountCents <= 0) return 0;
  return Math.ceil((amountCents * feePercent) / 100);
}
