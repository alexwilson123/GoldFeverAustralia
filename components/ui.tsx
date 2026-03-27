import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: Array<string | false | null | undefined>) {
  return twMerge(clsx(inputs));
}

export function Panel({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "rounded-[28px] border p-4 shadow-[0_20px_70px_rgba(0,0,0,0.12)] backdrop-blur-xl",
        "border-[color:var(--border)] bg-[color:var(--panel)]",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function Badge({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em]",
        "border-[color:var(--border)] bg-[color:var(--accent-soft)] text-[color:var(--accent-strong)]",
        className,
      )}
    >
      {children}
    </span>
  );
}
