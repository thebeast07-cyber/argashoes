import "./env";
import { parseArgs } from "node:util";
import { createNeonDb, createPgliteDb } from "@/db";
import { isPeran } from "@/lib/auth/roles";
import { buatUser } from "@/lib/auth/session";

// Buat akun admin dari terminal, terutama akun pemilik pertama.
// Contoh: npm run user:create -- --nama "Najah" --email najah@contoh.com --peran pemilik
// Password dibaca dari env ADMIN_PASSWORD supaya tidak tersimpan di riwayat shell.
// Catatan PGlite: hentikan `npm run dev` dulu, PGlite hanya bisa dibuka satu proses.

async function main() {
  const { values } = parseArgs({
    options: {
      nama: { type: "string" },
      email: { type: "string" },
      peran: { type: "string", default: "admin_toko" },
    },
  });
  const password = process.env.ADMIN_PASSWORD;
  if (!values.nama || !values.email || !password || !isPeran(values.peran)) {
    console.error(
      'Pakai: ADMIN_PASSWORD=... npm run user:create -- --nama "Nama" --email a@b.com --peran pemilik|admin_toko',
    );
    process.exit(1);
  }

  const url = process.env.DATABASE_URL;
  const { db, close } = url ? createNeonDb(url) : await createPgliteDb(process.env.PGLITE_DIR || ".data/pglite");
  try {
    const user = await buatUser(db, { nama: values.nama, email: values.email, peran: values.peran, password });
    console.log(`Akun dibuat: ${user.email} (${user.peran})`);
  } finally {
    await close();
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
