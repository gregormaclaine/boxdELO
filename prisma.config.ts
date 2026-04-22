import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  engine: "classic",
  datasource: {
    // Use process.env directly so this is undefined (not a thrown error) when
    // DATABASE_URL isn't set at Docker build time. The real value is injected
    // by Railway at container start and read via schema.prisma's env().
    url: process.env.DATABASE_URL ?? "",
  },
});
