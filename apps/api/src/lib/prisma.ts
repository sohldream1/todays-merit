import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { env } from "./env.js";

// Prisma 7 dropped the native Rust query engine binaries — the client now
// always connects through a driver adapter instead of a `datasource.url` in
// schema.prisma. `pg` is a pure-JS/WASM driver, so this also happens to sidestep
// the native-binary-vs-CPU-architecture problems the old engine had (e.g. no
// prebuilt engine for Windows on ARM64).
const adapter = new PrismaPg({ connectionString: env.databaseUrl });

// Reuse a single PrismaClient across tsx watch reloads in dev to avoid
// exhausting Postgres connections.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
