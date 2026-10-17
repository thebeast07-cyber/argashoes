import type { SVGProps } from "react";

// Ikon buatan sendiri (DESIGN.md): grid 24, garis 1.75, ujung dan sambungan siku.
// Selalu dipasang di samping teks, jadi aria-hidden.

type Props = SVGProps<SVGSVGElement> & { ukuran?: number };

function Dasar({ ukuran = 22, children, ...rest }: Props) {
  return (
    <svg
      width={ukuran}
      height={ukuran}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="square"
      strokeLinejoin="miter"
      aria-hidden="true"
      focusable="false"
      {...rest}
    >
      {children}
    </svg>
  );
}

/** Beranda: kardus sepatu dilihat dari depan, dengan label ujungnya. */
export function IkonKardus(p: Props) {
  return (
    <Dasar {...p}>
      <path d="M3 8h18v12H3zM3 8l2-4h14l2 4" />
      <path d="M8 12h8v4H8z" />
    </Dasar>
  );
}

/** Produk: siluet sneaker dari samping. */
export function IkonSepatu(p: Props) {
  return (
    <Dasar {...p}>
      <path d="M2 18V9h5l3 4 9 1.5c1.8.3 3 1.2 3 2.5V18z" />
      <path d="M2 15h20M8 10.5l1.5-1.5M10 13l1.5-1.5" />
    </Dasar>
  );
}

/** Akun: dua kartu nama bertumpuk. */
export function IkonKartuNama(p: Props) {
  return (
    <Dasar {...p}>
      <path d="M6 4h15v11M3 8h15v12H3z" />
      <path d="M7 13h2M7 16h7" />
    </Dasar>
  );
}

export function IkonCari(p: Props) {
  return (
    <Dasar {...p}>
      <path d="M4 4h10v10H4z" />
      <path d="M14 14l6 6" />
    </Dasar>
  );
}

/** Import: panah masuk ke kardus. */
export function IkonMasukKardus(p: Props) {
  return (
    <Dasar {...p}>
      <path d="M12 2v10M8.5 8.5L12 12l3.5-3.5" />
      <path d="M3 13h5l1 2h6l1-2h5v8H3z" />
    </Dasar>
  );
}

/** Ekspor: panah keluar dari kardus. */
export function IkonKeluarKardus(p: Props) {
  return (
    <Dasar {...p}>
      <path d="M12 12V2M8.5 5.5L12 2l3.5 3.5" />
      <path d="M3 13h5l1 2h6l1-2h5v8H3z" />
    </Dasar>
  );
}

export function IkonTambah(p: Props) {
  return (
    <Dasar {...p}>
      <path d="M12 5v14M5 12h14" />
    </Dasar>
  );
}

export function IkonKembali(p: Props) {
  return (
    <Dasar {...p}>
      <path d="M15 5l-7 7 7 7" />
    </Dasar>
  );
}

/** Tandai habis: label kardus dicoret. */
export function IkonCoret(p: Props) {
  return (
    <Dasar {...p}>
      <path d="M5 5h14v14H5z" />
      <path d="M3 21L21 3" />
    </Dasar>
  );
}

/** Keranjang: troli dengan sudut siku. */
export function IkonKeranjang(p: Props) {
  return (
    <Dasar {...p}>
      <path d="M3 5h3l2 11h11l2-8H7" />
      <path d="M9 20h2M16 20h2" />
    </Dasar>
  );
}

/** WhatsApp: balon chat persegi, bukan logo merek. */
export function IkonChat(p: Props) {
  return (
    <Dasar {...p}>
      <path d="M4 4h16v12H11l-5 4v-4H4z" />
      <path d="M8 9h8M8 12h5" />
    </Dasar>
  );
}

/** Pesan gagal: kotak dengan tanda seru, supaya galat tidak dibedakan dari warna saja. */
export function IkonGalat(p: Props) {
  return (
    <Dasar {...p}>
      <path d="M4 4h16v16H4z" />
      <path d="M12 8v5M12 16v1.5" />
    </Dasar>
  );
}

/** Pengaturan: tiga penggeser dengan kenop kotak, nilai yang bisa diatur. */
export function IkonPengaturan(p: Props) {
  return (
    <Dasar {...p}>
      <path d="M3 6h4M11 6h10M3 12h10M17 12h4M3 18h2M9 18h12" />
      <path d="M7 4h4v4H7zM13 10h4v4h-4zM5 16h4v4H5z" />
    </Dasar>
  );
}
