import { type ReactNode } from "react";

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-2">
      <span className="text-xs font-medium tracking-wide text-muted uppercase">{label}</span>
      {children}
    </label>
  );
}

export function Panel({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={`rounded-lg border border-border bg-surface p-4 ${className}`}>{children}</section>;
}

export function Mono({ children }: { children: React.ReactNode }) {
  return <span className="font-mono text-xs tracking-wide break-all">{children}</span>;
}
