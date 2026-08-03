import {
  ArrowDownLeft,
  ArrowLeftRight,
  ArrowUpRight,
  Briefcase,
  Clapperboard,
  Coffee,
  Croissant,
  HeartPulse,
  House,
  Repeat,
  ShoppingBag,
  ShoppingCart,
  TrainFront,
  Undo2,
  Zap,
  type LucideIcon,
} from "lucide-react";
import type { Transaction } from "@/lib/types";

interface TxVisual {
  icon: LucideIcon;
  cls: string;
}

const BY_CATEGORY: Record<string, TxVisual> = {
  Alimentation: { icon: Croissant, cls: "border-peach/15 bg-peach/10 text-peach" },
  Restaurants: { icon: Coffee, cls: "border-peach/15 bg-peach/10 text-peach" },
  Transport: { icon: TrainFront, cls: "border-sky/15 bg-sky/10 text-sky" },
  Courses: { icon: ShoppingCart, cls: "border-mint/15 bg-mint/10 text-mint" },
  Abonnements: { icon: Repeat, cls: "border-violet/15 bg-violet/10 text-violet" },
  Salaire: { icon: Briefcase, cls: "border-mint/15 bg-mint/10 text-mint" },
  Factures: { icon: Zap, cls: "border-sky/15 bg-sky/10 text-sky" },
  Santé: { icon: HeartPulse, cls: "border-rose/15 bg-rose/10 text-rose" },
  Shopping: { icon: ShoppingBag, cls: "border-violet/15 bg-violet/10 text-violet" },
  Loisirs: { icon: Clapperboard, cls: "border-rose/15 bg-rose/10 text-rose" },
  Logement: { icon: House, cls: "border-sky/15 bg-sky/10 text-sky" },
  Remboursement: { icon: Undo2, cls: "border-mint/15 bg-mint/10 text-mint" },
};

/** Icône + palette selon le type / la catégorie de transaction. */
export function txVisual(tx: Transaction): TxVisual {
  if (tx.kind === "receive") return { icon: ArrowDownLeft, cls: "border-mint/15 bg-mint/10 text-mint" };
  if (tx.kind === "send") return { icon: ArrowUpRight, cls: "border-sky/15 bg-sky/10 text-sky" };
  if (tx.kind === "transfer") return { icon: ArrowLeftRight, cls: "border-violet/15 bg-violet/10 text-violet" };
  return BY_CATEGORY[tx.category] ?? { icon: ShoppingBag, cls: "border-line bg-ink/[0.04] text-mut" };
}
