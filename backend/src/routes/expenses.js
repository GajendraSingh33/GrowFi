const express = require("express");
const prisma = require("../db/client");
const AppError = require("../utils/AppError");
const { requireAuth } = require("../middleware/auth");
const { requireOwnedRecord } = require("../utils/ownership");
const {
  expenseBody,
  expenseQuery,
  summaryQuery,
  parse,
  utcDate,
} = require("../validators/finance");

const router = express.Router();
router.use(requireAuth);

async function accessibleCategory(categoryId, userId) {
  const category = await prisma.expenseCategory.findUnique({ where: { categoryId } });
  if (!category) {
    throw new AppError(404, "CATEGORY_NOT_FOUND", "Expense category not found");
  }
  if (!category.isDefault && category.userId !== userId) {
    throw new AppError(403, "FORBIDDEN", "You do not have access to this category");
  }
  return category;
}

function expenseData(input, userId) {
  return {
    categoryId: input.categoryId,
    amount: input.amount,
    description: input.description === undefined ? null : input.description,
    expenseDate: utcDate(input.expenseDate),
    ...(userId ? { userId } : {}),
  };
}

router.get("/", async (req, res, next) => {
  try {
    const query = parse(expenseQuery, req.query);
    const where = {
      userId: req.user.userId,
      ...(query.categoryId ? { categoryId: query.categoryId } : {}),
      ...(query.from || query.to
        ? { expenseDate: { ...(query.from ? { gte: utcDate(query.from) } : {}), ...(query.to ? { lte: utcDate(query.to) } : {}) } }
        : {}),
    };
    const [items, total] = await Promise.all([
      prisma.expense.findMany({
        where,
        include: { category: true },
        orderBy: { expenseDate: "desc" },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      prisma.expense.count({ where }),
    ]);
    return res.json({ data: { items, page: query.page, pageSize: query.pageSize, total } });
  } catch (error) {
    return next(error);
  }
});

router.post("/", async (req, res, next) => {
  try {
    const input = parse(expenseBody, req.body);
    await accessibleCategory(input.categoryId, req.user.userId);
    const item = await prisma.expense.create({
      data: expenseData(input, req.user.userId),
      include: { category: true },
    });
    return res.status(201).json({ data: item });
  } catch (error) {
    return next(error);
  }
});

router.put("/:id", async (req, res, next) => {
  try {
    const input = parse(expenseBody, req.body);
    await requireOwnedRecord({
      model: prisma.expense,
      idField: "expenseId",
      id: req.params.id,
      userId: req.user.userId,
    });
    await accessibleCategory(input.categoryId, req.user.userId);
    const item = await prisma.expense.update({
      where: { expenseId: req.params.id },
      data: expenseData(input),
      include: { category: true },
    });
    return res.json({ data: item });
  } catch (error) {
    return next(error);
  }
});

router.delete("/:id", async (req, res, next) => {
  try {
    await requireOwnedRecord({
      model: prisma.expense,
      idField: "expenseId",
      id: req.params.id,
      userId: req.user.userId,
    });
    await prisma.expense.delete({ where: { expenseId: req.params.id } });
    return res.status(204).send();
  } catch (error) {
    return next(error);
  }
});

router.get("/summary", async (req, res, next) => {
  try {
    const query = parse(summaryQuery, req.query);
    const now = new Date();
    const month = query.month || `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
    const from = query.from || `${month}-01`;
    const to = query.to || `${month}-${new Date(Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 0)).getUTCDate()}`;
    const rows = await prisma.expense.groupBy({
      by: ["categoryId"],
      where: {
        userId: req.user.userId,
        expenseDate: { gte: utcDate(from), lte: utcDate(to) },
      },
      _sum: { amount: true },
    });
    const categories = await prisma.expenseCategory.findMany({
      where: { categoryId: { in: rows.map((row) => row.categoryId) } },
      select: { categoryId: true, name: true },
    });
    const names = new Map(categories.map((category) => [category.categoryId, category.name]));
    const items = rows.map((row) => ({
      categoryId: row.categoryId,
      name: names.get(row.categoryId),
      totalAmount: row._sum.amount,
    }));
    const totalAmount = rows.reduce((sum, row) => sum + Number(row._sum.amount || 0), 0).toFixed(2);
    return res.json({ data: { month, items, totalAmount } });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
