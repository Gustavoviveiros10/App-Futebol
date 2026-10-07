import { whatsappLink } from "@/lib/whatsapp";

export function WhatsAppIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M17.47 14.38c-.3-.15-1.75-.86-2.02-.96-.27-.1-.47-.15-.67.15-.2.3-.77.96-.94 1.16-.17.2-.35.22-.64.07-.3-.15-1.25-.46-2.38-1.47-.88-.79-1.47-1.76-1.65-2.06-.17-.3-.02-.46.13-.6.13-.14.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.08-.15-.67-1.6-.92-2.2-.24-.58-.49-.5-.67-.5h-.57c-.2 0-.52.07-.8.37-.27.3-1.04 1.02-1.04 2.48s1.07 2.88 1.21 3.08c.15.2 2.1 3.2 5.08 4.48.71.31 1.26.49 1.7.63.71.22 1.36.19 1.87.12.57-.09 1.75-.72 2-1.41.25-.7.25-1.29.17-1.41-.07-.13-.27-.2-.57-.35M12.05 21.5h-.01a9.5 9.5 0 0 1-4.84-1.33l-.35-.2-3.6.94.96-3.5-.23-.36a9.46 9.46 0 0 1-1.45-5.05c0-5.24 4.27-9.5 9.52-9.5a9.5 9.5 0 0 1 9.5 9.51c0 5.24-4.27 9.5-9.5 9.5m8.1-17.6A11.4 11.4 0 0 0 12.04.5C5.73.5.6 5.63.6 11.94c0 2.02.53 3.99 1.53 5.72L.5 23.5l5.98-1.57a11.4 11.4 0 0 0 5.56 1.42h.01c6.3 0 11.44-5.13 11.44-11.44 0-3.06-1.19-5.93-3.35-8.1" />
    </svg>
  );
}

export function WhatsAppButton({ text, phone, label = "Enviar no WhatsApp", className = "btn-whatsapp w-full" }: { text: string; phone?: string | null; label?: string; className?: string }) {
  return (
    <a href={whatsappLink(text, phone)} target="_blank" rel="noopener noreferrer" className={className}>
      <WhatsAppIcon />
      {label}
    </a>
  );
}
