"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion, MotionConfig } from "framer-motion";
import { Sparkles } from "lucide-react";
import { BankProvider, useBank } from "./bank-provider";
import { BottomNav } from "./bottom-nav";
import { DesktopSidebar } from "./desktop-sidebar";
import { TransferSheet } from "./transfer-sheet";

/* Overlay plein cadre (au-dessus de la nav) pour les confirmations des pages. */
const OverlayContext = createContext<(node: ReactNode | null) => void>(() => {});
export function useOverlay() {
  return useContext(OverlayContext);
}

function ShellInner({ children }: { children: ReactNode }) {
  const { ready } = useBank();
  const [overlay, setOverlayState] = useState<ReactNode | null>(null);
  const setOverlay = useCallback((node: ReactNode | null) => setOverlayState(node), []);
  const pathname = usePathname();
  const scrollRef = useRef<HTMLDivElement>(null);

  // Au changement de page, on repart du haut (sinon le scroll persiste entre onglets)
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 });
  }, [pathname]);

  return (
    <OverlayContext.Provider value={setOverlay}>
      <div className="relative flex h-dvh overflow-hidden md:h-screen">
        <DesktopSidebar />
        <div className="relative flex min-h-0 min-w-0 flex-1 flex-col bg-paper">
          <div ref={scrollRef} className="no-scrollbar relative min-h-0 flex-1 overflow-y-auto">
            {children}
          </div>
          <BottomNav />
          <TransferSheet />
          <AnimatePresence>
            {overlay ? <div className="absolute inset-0 z-[65]">{overlay}</div> : null}
          </AnimatePresence>
        </div>
      </div>

      <AnimatePresence>
        {!ready && (
          <motion.div
            className="absolute inset-0 z-[80] grid place-items-center bg-paper"
            exit={{ opacity: 0, transition: { duration: 0.5, ease: "easeInOut" } }}
          >
            <div className="flex flex-col items-center gap-4">
              <motion.div
                className="grid h-16 w-16 place-items-center rounded-[22px] bg-ink text-lime shadow-[0_18px_40px_-12px_rgba(11,15,20,0.4)]"
                animate={{ scale: [1, 1.07, 1], rotate: [0, -3, 0] }}
                transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
              >
                <Sparkles className="h-7 w-7" strokeWidth={2.4} />
              </motion.div>
              <div className="font-display text-lg font-semibold tracking-tight text-ink">Nova</div>
              <div className="flex gap-1.5">
                {[0, 1, 2].map((i) => (
                  <motion.span
                    key={i}
                    className="h-1.5 w-1.5 rounded-full bg-ink/50"
                    animate={{ opacity: [0.2, 1, 0.2] }}
                    transition={{ duration: 1, repeat: Infinity, delay: i * 0.18 }}
                  />
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </OverlayContext.Provider>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="ambient relative min-h-dvh md:min-h-screen">
      <div className="grain relative">
        <BankProvider>
          <MotionConfig reducedMotion="user">
            <ShellInner>{children}</ShellInner>
          </MotionConfig>
        </BankProvider>
      </div>
    </div>
  );
}
