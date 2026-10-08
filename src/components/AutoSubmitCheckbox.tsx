"use client";

/** Caixinha que envia o formulário em volta assim que muda. */
export function AutoSubmitCheckbox({ checked, label, className = "" }: { checked: boolean; label: React.ReactNode; className?: string }) {
  return (
    <label className={`flex cursor-pointer items-center gap-1.5 ${className}`}>
      <input type="checkbox" defaultChecked={checked} onChange={(e) => e.currentTarget.form?.requestSubmit()} className="h-4 w-4 accent-[var(--color-accent)]" />
      {label}
    </label>
  );
}
