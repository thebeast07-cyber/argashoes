"use client";

import { formatRibuanSaatKetik } from "@/lib/domain/produk";

type Props = Omit<React.InputHTMLAttributes<HTMLInputElement>, "type" | "inputMode">;

/** Posisi kursor setelah format: tetap di belakang digit yang sama, walau titik bertambah atau berkurang. */
function posisiSetelahFormat(teks: string, digitSebelumKursor: number): number {
  if (digitSebelumKursor === 0) return 0;
  let n = 0;
  for (let i = 0; i < teks.length; i++) {
    if (/\d/.test(teks[i]) && ++n === digitSebelumKursor) return i + 1;
  }
  return teks.length;
}

// Kolom uang: titik ribuan muncul sendiri saat mengetik (1599000 → 1.599.000), dengan "Rp" di depan.
// Bisa dipakai terkontrol (value + onChange) maupun tidak (defaultValue + name di form).
export function InputRupiah({ className = "", defaultValue, value, onChange, ...props }: Props) {
  return (
    <div className="relative">
      <span aria-hidden="true" className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-redup">
        Rp
      </span>
      <input
        {...props}
        inputMode="numeric"
        autoComplete="off"
        value={value === undefined ? undefined : formatRibuanSaatKetik(String(value))}
        defaultValue={defaultValue === undefined ? undefined : formatRibuanSaatKetik(String(defaultValue))}
        onKeyDown={(e) => {
          // Titik dibuat ulang setelah dihapus, jadi hapus tepat di sebelah titik langsung mengenai digit di baliknya.
          const el = e.currentTarget;
          const pos = el.selectionStart;
          if (pos !== null && pos === el.selectionEnd) {
            if (e.key === "Backspace" && el.value[pos - 1] === ".") el.setSelectionRange(pos - 1, pos - 1);
            if (e.key === "Delete" && el.value[pos] === ".") el.setSelectionRange(pos + 1, pos + 1);
          }
          props.onKeyDown?.(e);
        }}
        onChange={(e) => {
          const el = e.currentTarget;
          const kursor = el.selectionStart ?? el.value.length;
          const digitSebelum = el.value.slice(0, kursor).replace(/\D/g, "").length;
          const rapi = formatRibuanSaatKetik(el.value);
          if (rapi !== el.value) {
            el.value = rapi;
            const pos = posisiSetelahFormat(rapi, digitSebelum);
            el.setSelectionRange(pos, pos);
          }
          onChange?.(e);
        }}
        className={`${className} pl-10`}
      />
    </div>
  );
}
