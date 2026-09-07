const express = require("express");
const prisma = require("../db/client");
const AppError = require("../utils/AppError");
const { requireAuth } = require("../middleware/auth");
const { categoryBody, parse } = require("../validators/finance");

const router = express.Router();
router.use(requireAuth);

router.get("/", async (req, res, next) => {
  try {
    const items = await prisma.expenseCategory.findMany({
      where: { OR: [{ isDefault: true, userId: null }, { userId: req.user.userId }] },
      orderBy: { name: "asc" },
    });
    return res.json({ data: items });
  } catch (error) {
    return next(error);
  }
});

router.post("/", async (req, res, next) => {
  try {
    const input = parse(categoryBody, req.body);
    const duplicate = await prisma.expenseCategory.findFirst({
      where: { userId: req.user.userId, name: { equals: input.name, mode: "insensitive" } },
    });
    if (duplicate) {
      throw new AppError(409, "CATEGORY_CONFLICT", "A category with this name already exists");
    }
    const item = await prisma.expenseCategory.create({
      data: { ...input, userId: req.user.userId, isDefault: false },
    });
    return res.status(201).json({ data: item });
  } catch (error) {
    return next(error);
  }
});

router.delete("/:id", async (req, res, next) => {
  try {
    const category = await prisma.expenseCategory.findUnique({
      where: { categoryId: req.params.id },
    });
    if (!category) {
      throw new AppError(404, "NOT_FOUND", "Category not found");
    }
    if (category.isDefault || category.userId !== req.user.userId) {
      throw new AppError(403, "FORBIDDEN", "This category cannot be deleted");
    }
    const expenseCount = await prisma.expense.count({ where: { categoryId: category.categoryId } });
    if (expenseCount > 0) {
      throw new AppError(409, "CATEGORY_IN_USE", "Reassign existing expenses before deleting this category");
    }
    await prisma.expenseCategory.delete({ where: { categoryId: category.categoryId } });
    return res.status(204).send();
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
