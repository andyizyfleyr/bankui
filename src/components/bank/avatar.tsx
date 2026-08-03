import { initials } from "@/lib/format";
import { cn } from "@/lib/format";

/** Avatar gradient avec initiales — style glass teinté. */
export function ContactAvatar({
  name,
  color,
  size = 48,
  className,
}: {
  name: string;
  color: string;
  size?: number;
  className?: string;
}) {
  return (
    <div
      className={cn("grid shrink-0 place-items-center rounded-full font-display font-semibold", className)}
      style={{
        width: size,
        height: size,
        fontSize: size * 0.36,
        color,
        background: `linear-gradient(145deg, ${color}2B 0%, ${color}12 100%)`,
        border: `1px solid ${color}45`,
      }}
    >
      {initials(name)}
    </div>
  );
}
