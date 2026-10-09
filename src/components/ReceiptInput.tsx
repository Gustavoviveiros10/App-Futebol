"use client";

import { useRef, useState } from "react";
import { Camera, X } from "lucide-react";

/** Foto do comprovante, reduzida no próprio celular antes de enviar. */
export function ReceiptInput({ name }: { name: string }) {
  const [photo, setPhoto] = useState("");
  const ref = useRef<HTMLInputElement>(null);

  async function onFile(file: File) {
    const img = new Image();
    img.src = URL.createObjectURL(file);
    await img.decode();
    const scale = Math.min(1, 900 / Math.max(img.width, img.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(img.width * scale);
    canvas.height = Math.round(img.height * scale);
    canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
    setPhoto(canvas.toDataURL("image/jpeg", 0.6));
    URL.revokeObjectURL(img.src);
  }

  return (
    <div>
      <input type="hidden" name={name} value={photo} />
      <input ref={ref} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} />
      {photo ? (
        <div className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={photo} alt="Comprovante" className="h-16 w-16 rounded-xl object-cover" />
          <button type="button" onClick={() => setPhoto("")} className="btn-ghost btn-sm"><X size={16} /> Remover</button>
        </div>
      ) : (
        <button type="button" onClick={() => ref.current?.click()} className="btn-ghost btn-sm w-full">
          <Camera size={16} /> Foto do comprovante (opcional)
        </button>
      )}
    </div>
  );
}
