import { LABEL_STATUS, type StatusOrder } from "@/lib/domain/order-status";

// Status order selalu tertulis; warna hanya penguat. Lead memakai warna "perlu perhatian" yang sama dengan Sisa sedikit.
const GAYA: Record<StatusOrder, string> = {
  lead: "border-sedikit-teks bg-sedikit-latar text-sedikit-teks",
  dikonfirmasi: "border-tinta bg-white text-tinta",
  dikirim: "border-tinta bg-tinta text-kertas",
  selesai: "border-tinta/55 bg-kertas text-tinta",
  batal: "border-habis/60 bg-kertas text-habis",
};

export function LabelStatus({ status }: { status: StatusOrder }) {
  return <span className={`sempit inline-block rounded-label border-[1.5px] px-1.5 py-0.5 text-xs font-bold leading-none ${GAYA[status]}`}>{LABEL_STATUS[status]}</span>;
}
