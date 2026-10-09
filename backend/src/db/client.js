require("dotenv").config();

const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");
const { Pool } = require("pg");

// Render / Cloud PostgreSQL requires SSL for external connections.
// When deployed on Render (internal network URL), SSL is handled automatically or not needed.
const dbUrl = process.env.DATABASE_URL || "";
const ssl =
  dbUrl.includes("render.com") || dbUrl.includes("sslmode=require") || dbUrl.includes("ssl=true")
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
