import { Fragment } from "react";

// Nama sepatu sering berisi warna bersambung garis miring (BLUE/SILVER/OBSIDIAN) tanpa spasi.
// <wbr> setelah "/" membuat browser memilih patah di sana dulu; [overflow-wrap:anywhere] di pemanggil jadi cadangan terakhir.
export function NamaProduk({ nama }: { nama: string }) {
  const bagian = nama.split("/");
  return (
    <>
      {bagian.map((b, i) => (
        <Fragment key={i}>
          {b}
          {i < bagian.length - 1 && (
            <>
              /<wbr />
            </>
          )}
        </Fragment>
      ))}
    </>
  );
}
