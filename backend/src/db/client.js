require("dotenv").config();

const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");
const { Pool } = require("pg");

// Render PostgreSQL requires SSL for external connections.
// When deployed on Render itself (internal URL), SSL is not needed.
const ssl = process.env.DATABASE_URL?.includes("render.com")
  ? { rejectUnauthorized: false }
  : false;

const pool = globalThis.__growfiPrismaPool ?? new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl,
});
const prisma =
  globalThis.__growfiPrisma ??
  new PrismaClient({ adapter: new PrismaPg(pool) });

if (process.env.NODE_ENV !== "production") {
  globalThis.__growfiPrisma = prisma;
  globalThis.__growfiPrismaPool = pool;
}

module.exports = prisma;
