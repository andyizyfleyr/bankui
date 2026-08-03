"use client";

import { useEffect, useState } from "react";
import { useMotionValue, useMotionValueEvent, useSpring } from "framer-motion";
import { formatEUR } from "@/lib/format";

/** Montant statique avec masquage optionnel. */
export function MoneyText({
  cents,
  hidden = false,
  className,
}: {
  cents: number;
  hidden?: boolean;
  className?: string;
}) {
  if (hidden) return <span className={className}>••&nbsp;••</span>;
  return <span className={className}>{formatEUR(cents)}</span>;
}

/** Montant animé par ressort physique (compteur qui glisse vers la valeur). */
export function AnimatedMoney({
  cents,
  hidden = false,
  className,
}: {
  cents: number;
  hidden?: boolean;
  className?: string;
}) {
  const mv = useMotionValue(0);
  const spring = useSpring(mv, { stiffness: 95, damping: 19, mass: 0.7 });
  const [value, setValue] = useState(0);

  useEffect(() => {
    mv.set(cents);
  }, [cents, mv]);

  useMotionValueEvent(spring, "change", (n) => setValue(n));

  if (hidden) return <span className={className}>••&nbsp;••</span>;
  return <span className={className}>{formatEUR(Math.round(value))}</span>;
}
