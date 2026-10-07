"use client";

import { useRef, useState } from "react";
import { Camera } from "lucide-react";
import { Avatar } from "./ui";

/** Reduz a foto no próprio celular (256px, JPEG) antes de enviar. */
export function PhotoInput({ name, initial, defaultValue }: { name: string; initial: string; defaultValue?: string | null }) {
  const [photo, setPhoto] = useState(defaultValue ?? "");
  const fileRef = useRef<HTMLInputElement>(null);

  async function onFile(file: File) {
    const img = new Image();
    img.src = URL.createObjectURL(file);
    await img.decode();
    const size = 256;
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = size;
    const ctx = canvas.getContext("2d")!;
    const s = Math.min(img.width, img.height);
    ctx.drawImage(img, (img.width - s) / 2, (img.height - s) / 2, s, s, 0, 0, size, size);
    setPhoto(canvas.toDataURL("image/jpeg", 0.8));
    URL.revokeObjectURL(img.src);
  }

  return (
    <div className="flex items-center gap-4">
      <button type="button" onClick={() => fileRef.current?.click()} className="relative">
        <Avatar name={initial || "?"} photo={photo || null} size={72} />
        <span className="absolute -bottom-1 -right-1 rounded-full bg-accent p-1.5 text-bg">
          <Camera size={14} />
        </span>
      </button>
      <div className="text-sm text-fg/55">
        <button type="button" className="font-semibold text-accent" onClick={() => fileRef.current?.click()}>
          {photo ? "Trocar foto" : "Adicionar foto"}
        </button>
        {photo && (
          <button type="button" className="ml-3 text-fg/45" onClick={() => setPhoto("")}>
            Remover
          </button>
        )}
      </div>
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} />
      <input type="hidden" name={name} value={photo} />
    </div>
  );
}
