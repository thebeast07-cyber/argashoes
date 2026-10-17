import { getDb } from "@/db";
import { getNomorWa } from "@/lib/pengaturan/data";
import { Keranjang } from "./keranjang";

export const metadata = { title: "Keranjang · Argashoes", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function HalamanKeranjang() {
  const bisaPesan = Boolean(await getNomorWa(await getDb()));
  return <Keranjang bisaPesan={bisaPesan} />;
}
