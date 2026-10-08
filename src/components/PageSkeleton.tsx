/** Esqueleto mostrado na hora enquanto a próxima tela carrega. */
export function PageSkeleton() {
  return (
    <div className="flex animate-pulse flex-col gap-4 pt-3" aria-busy="true" aria-label="Carregando">
      <div className="h-9 w-2/3 rounded-xl bg-fg/[0.07]" />
      <div className="h-40 rounded-2xl bg-fg/[0.05]" />
      <div className="h-24 rounded-2xl bg-fg/[0.05]" />
      <div className="h-24 rounded-2xl bg-fg/[0.05]" />
    </div>
  );
}
