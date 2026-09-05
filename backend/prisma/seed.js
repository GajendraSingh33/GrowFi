require("dotenv").config();

const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");
const { Pool } = require("pg");

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
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
  await prisma.$transaction(async (transaction) => {
    for (const name of defaultCategories) {
      const existingCategory = await transaction.expenseCategory.findFirst({
        where: { name },
      });

      if (existingCategory) {
        await transaction.expenseCategory.update({
          where: { categoryId: existingCategory.categoryId },
          data: { isDefault: true },
        });
      } else {
        await transaction.expenseCategory.create({
          data: { name, isDefault: true },
        });
      }
    }
  });
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
