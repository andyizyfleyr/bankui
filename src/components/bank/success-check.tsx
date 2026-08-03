"use client";

import { motion } from "framer-motion";

/** Cercle + coche animés (draw) pour les confirmations. */
export function SuccessCheck({ size = 84, color = "#0D9F6E" }: { size?: number; color?: string }) {
  return (
    <motion.svg
      viewBox="0 0 72 72"
      width={size}
      height={size}
      initial={{ scale: 0.6, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: "spring", stiffness: 260, damping: 18 }}
    >
      <motion.circle
        cx="36"
        cy="36"
        r="31"
        fill="none"
        stroke={color}
        strokeWidth="4"
        strokeLinecap="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.55, ease: "easeOut" }}
      />
      <motion.path
        d="M23 37.5 L32 46 L50 27"
        fill="none"
        stroke={color}
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.4, delay: 0.35, ease: "easeOut" }}
      />
    </motion.svg>
  );
}
