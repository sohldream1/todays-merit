import "dotenv/config";
import { defineConfig, env } from "prisma/config";

// Prisma 7 moved the Migrate CLI's connection URL out of schema.prisma and
// into this file — application code still connects via the `pg` driver
// adapter (see lib/prisma.ts), this is only what `prisma migrate`/`db push`/
// `studio` use.
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: env("DATABASE_URL"),
  },
});
