/** CEP: só os 8 dígitos, ou null. */
export function cleanCep(raw: string): string | null {
  const d = raw.replace(/\D/g, "");
  return d.length === 8 && !/^0+$/.test(d) ? d : null;
}

/** Celular/telefone com DDD: 10 ou 11 dígitos (sem +55), ou null. */
export function cleanPhone(raw: string): string | null {
  let d = raw.replace(/\D/g, "");
  if (d.length > 11 && d.startsWith("55")) d = d.slice(2);
  if (d.length !== 10 && d.length !== 11) return null;
  if (d[0] === "0" || d[1] === "0") return null; // DDD inválido
  return d;
}
