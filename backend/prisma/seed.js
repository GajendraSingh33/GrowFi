require("dotenv").config();

const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");
const { Pool } = require("pg");

// Render PostgreSQL requires SSL for external connections
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes("render.com")
    ? { rejectUnauthorized: false }
    : false,
});
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

const defaultCategories = [
  "Food",
  "Transport",
  "Rent",
  "Utilities",
  "Entertainment",
  "Healthcare",
  "Other",
];

async function main() {
  for (const name of defaultCategories) {
    const existing = await prisma.expenseCategory.findFirst({ where: { name } });

    if (existing) {
      await prisma.expenseCategory.update({
        where: { categoryId: existing.categoryId },
        data: { isDefault: true },
      });
      console.log(`Updated: ${name}`);
    } else {
      await prisma.expenseCategory.create({
        data: { name, isDefault: true },
      });
      console.log(`Created: ${name}`);
    }
  }

  console.log("Seed completed successfully.");
}

main()
  .catch((error) => {
    console.error("Database seed failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
