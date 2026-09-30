import { PrismaClient } from "@prisma/client";
import fs from "fs";
import path from "path";

function setupDatabase(): string {
  const envUrl = process.env.DATABASE_URL;
  if (envUrl && !envUrl.startsWith("file:")) {
    return envUrl;
  }

  // Vercel serverless muhitida fayl tizimi read-only.
  // SQLite write (intervyu yaratish, javob saqlash, login) ishlashi uchun /tmp ga ko'chiramiz.
  if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) {
    const tmpDbPath = path.join("/tmp", "dev.db");

    if (!fs.existsSync(tmpDbPath) || fs.statSync(tmpDbPath).size === 0) {
      const candidates = [
        path.join(process.cwd(), "prisma", "dev.db"),
        path.join(process.cwd(), ".next", "server", "prisma", "dev.db"),
        path.join(__dirname, "prisma", "dev.db"),
        path.join(__dirname, "..", "prisma", "dev.db"),
        path.join(__dirname, "..", "..", "prisma", "dev.db")
      ];

      for (const cand of candidates) {
        if (fs.existsSync(cand) && fs.statSync(cand).size > 0) {
          try {
            fs.copyFileSync(cand, tmpDbPath);
            break;
          } catch (e) {
            console.error("Failed to copy db from", cand, e);
          }
        }
      }
    }
    return `file:${tmpDbPath}`;
  }

  return envUrl || "file:./dev.db";
}

const dbUrl = setupDatabase();

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasources: {
      db: {
        url: dbUrl
      }
    },
    log: ["warn", "error"]
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
