import type { ReactNode } from "react";
import { PhoneFrame } from "@/components/bank/phone-frame";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return <PhoneFrame>{children}</PhoneFrame>;
}
