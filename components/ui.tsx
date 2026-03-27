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
        "rounded-3xl border p-4 shadow-[0_20px_70px_rgba(0,0,0,0.18)] backdrop-blur-xl",
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
        "inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.2em]",
        "border-[color:var(--border)] text-[color:var(--muted)]",
        className,
      )}
    >
      {children}
    </span>
  );
}
