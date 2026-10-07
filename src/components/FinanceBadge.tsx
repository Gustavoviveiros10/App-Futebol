import { Badge } from "./ui";

export function FinanceBadge({ status }: { status: "OK" | "PENDING" | "OVERDUE" | "PAID" | "CANCELED" }) {
  if (status === "OVERDUE") return <Badge tone="red">Atrasado</Badge>;
  if (status === "PENDING") return <Badge tone="amber">Pendente</Badge>;
  if (status === "CANCELED") return <Badge tone="gray">Cancelado</Badge>;
  return <Badge tone="green">{status === "PAID" ? "Pago" : "Em dia"}</Badge>;
}
