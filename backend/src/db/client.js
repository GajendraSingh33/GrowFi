require("dotenv").config();

const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");
const { Pool } = require("pg");

const pool = globalThis.__growfiPrismaPool ?? new Pool({
  connectionString: process.env.DATABASE_URL,
});
const prisma =
  globalThis.__growfiPrisma ??
  new PrismaClient({ adapter: new PrismaPg(pool) });

if (process.env.NODE_ENV !== "production") {
  globalThis.__growfiPrisma = prisma;
  globalThis.__growfiPrismaPool = pool;
}

module.exports = prisma;
