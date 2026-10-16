import { asc } from "drizzle-orm";
import { getDb } from "@/db";
import { users } from "@/db/schema";
import { wajibIzin } from "@/lib/auth/current";
import { LABEL_PERAN } from "@/lib/auth/roles";
import { FormAkun } from "./form-akun";

export const metadata = { title: "Akun admin · Argashoes" };

export default async function HalamanAkun() {
  await wajibIzin("akun.kelola");
  const db = await getDb();
  const daftar = await db
    .select({ id: users.id, nama: users.nama, email: users.email, peran: users.peran, aktif: users.aktif })
    .from(users)
    .orderBy(asc(users.dibuat));

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">Akun admin</h1>
      <ul className="divide-y divide-neutral-200 rounded-lg border border-neutral-200 bg-white">
        {daftar.map((u) => (
          <li key={u.id} className="px-4 py-3">
            <p className="font-medium">
              {u.nama} {!u.aktif && <span className="text-xs text-red-600">(nonaktif)</span>}
            </p>
            <p className="text-sm text-neutral-600">
              {u.email} · {LABEL_PERAN[u.peran]}
            </p>
          </li>
        ))}
      </ul>
      <section>
        <h2 className="mb-3 font-semibold">Tambah akun</h2>
        <FormAkun />
      </section>
    </div>
  );
}
