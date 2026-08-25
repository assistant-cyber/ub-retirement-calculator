import type { ReactNode } from "react";

export type CalloutVariant = "info" | "warning" | "alert" | "success";

const STYLES: Record<CalloutVariant, { box: string; title: string }> = {
  info: { box: "border-navy/30 bg-navy/5", title: "text-navy" },
  warning: { box: "border-gold/50 bg-gold/10", title: "text-[#8a6d10]" },
  alert: { box: "border-mulberry/40 bg-mulberry/5", title: "text-mulberry" },
  success: { box: "border-green/40 bg-green/5", title: "text-green" },
};

export default function Callout({
  variant = "info",
  title,
  children,
}: {
  variant?: CalloutVariant;
  title?: string;
  children: ReactNode;
}) {
  const s = STYLES[variant];
  return (
    <div className={`rounded-lg border px-4 py-3 ${s.box}`} role={variant === "alert" ? "alert" : undefined}>
      {title && <p className={`mb-1 font-semibold ${s.title}`}>{title}</p>}
      <div className="text-sm leading-relaxed text-gray-700">{children}</div>
    </div>
  );
}
