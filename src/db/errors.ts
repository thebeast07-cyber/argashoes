// Drizzle membungkus error Postgres; detail aslinya ada di `cause`.
type ErrorPg = { code?: string; constraint?: string; message?: string };

function errorPg(e: unknown): ErrorPg | undefined {
  return (e as { cause?: ErrorPg } | undefined)?.cause;
}

/** 23505 = unique_violation. Kalau `constraint` diberi, cocokkan juga nama constraint-nya. */
export function isUniqueViolation(e: unknown, constraint?: string): boolean {
  const pg = errorPg(e);
  if (pg?.code !== "23505") return false;
  if (!constraint) return true;
  return pg.constraint === constraint || Boolean(pg.message?.includes(constraint));
}
