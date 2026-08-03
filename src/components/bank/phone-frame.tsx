import type { ReactNode } from "react";

/** Cadre téléphone avec fond d'ambiance — partagé entre l'app et les pages auth. */
export function PhoneFrame({ children }: { children: ReactNode }) {
  return (
    <div className="ambient min-h-dvh md:flex md:items-center md:justify-center md:py-6">
      <div className="grain relative mx-auto flex h-dvh w-full max-w-[430px] flex-col overflow-hidden bg-paper md:h-[min(900px,calc(100dvh-3rem))] md:rounded-[44px] md:border md:border-white md:shadow-[0_80px_140px_-40px_rgba(16,24,40,0.35)]">
        {children}
      </div>
    </div>
  );
}
