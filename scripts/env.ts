import { existsSync } from "node:fs";

// Script CLI tidak lewat Next, jadi muat .env.local / .env sendiri.
for (const file of [".env.local", ".env"]) {
  if (existsSync(file)) process.loadEnvFile(file);
}
