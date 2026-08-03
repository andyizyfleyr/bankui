import { Sparkles } from "lucide-react";

/** Logo Nova — carré encre + étincelle lime, comme au splash screen. */
export function NovaLogo({ size = 52 }: { size?: number }) {
  return (
    <div
      className="grid shrink-0 place-items-center rounded-[22px] bg-ink text-lime shadow-[0_18px_40px_-12px_rgba(11,15,20,0.4)]"
      style={{ width: size, height: size }}
    >
      <Sparkles style={{ width: size * 0.44, height: size * 0.44 }} strokeWidth={2.4} />
    </div>
  );
}
