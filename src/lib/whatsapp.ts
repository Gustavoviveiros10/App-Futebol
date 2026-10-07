export function whatsappLink(text: string, phone?: string | null) {
  const digits = phone?.replace(/\D/g, "");
  const to = digits ? (digits.length <= 11 ? `55${digits}` : digits) : "";
  return `https://wa.me/${to}?text=${encodeURIComponent(text)}`;
}
