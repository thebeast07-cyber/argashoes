import { uraiDeskripsi } from "@/lib/domain/deskripsi";

// Deskripsi dari admin, dipecah jadi subjudul, paragraf, dan daftar poin (lihat uraiDeskripsi). Teks aslinya tidak diubah.
export function Deskripsi({ teks }: { teks: string }) {
  return (
    <div className="space-y-3 text-redup">
      {uraiDeskripsi(teks).map((b, i) =>
        b.jenis === "judul" ? (
          <h3 key={i} className="pt-1 font-bold text-tinta">
            {b.teks}
          </h3>
        ) : b.jenis === "paragraf" ? (
          <p key={i} className="break-words">
            {b.teks}
          </p>
        ) : (
          <ul key={i} className="list-disc space-y-1.5 pl-5 marker:text-tinta">
            {b.butir.map((t, j) => (
              <li key={j} className="break-words">
                {t.label && <span className="font-semibold text-tinta">{t.label}: </span>}
                {t.isi}
              </li>
            ))}
          </ul>
        ),
      )}
    </div>
  );
}
