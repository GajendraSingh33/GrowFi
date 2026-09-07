const express = require("express");
const prisma = require("../db/client");
const { requireAuth } = require("../middleware/auth");
const { requireOwnedRecord } = require("../utils/ownership");
const { incomeBody, listQuery, parse, utcDate } = require("../validators/finance");

const router = express.Router();

router.use(requireAuth);

router.get("/", async (req, res, next) => {
  try {
    const query = parse(listQuery, req.query);
    const where = { userId: req.user.userId };
    const [items, total] = await Promise.all([
      prisma.incomeSource.findMany({
        where,
        orderBy: { receivedDate: "desc" },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      prisma.incomeSource.count({ where }),
    ]);
    return res.json({ data: { items, page: query.page, pageSize: query.pageSize, total } });
  } catch (error) {
    return next(error);
  }
});

router.post("/", async (req, res, next) => {
  try {
    const input = parse(incomeBody, req.body);
    const item = await prisma.incomeSource.create({
      data: { ...input, amount: input.amount, receivedDate: utcDate(input.receivedDate), userId: req.user.userId },
    });
    return res.status(201).json({ data: item });
  } catch (error) {
    return next(error);
  }
});

router.put("/:id", async (req, res, next) => {
  try {
    const input = parse(incomeBody, req.body);
    await requireOwnedRecord({
      model: prisma.incomeSource,
      idField: "incomeId",
      id: req.params.id,
      userId: req.user.userId,
    });
    const item = await prisma.incomeSource.update({
      where: { incomeId: req.params.id },
      data: { ...input, receivedDate: utcDate(input.receivedDate) },
    });
    return res.json({ data: item });
  } catch (error) {
    return next(error);
  }
});

router.delete("/:id", async (req, res, next) => {
  try {
    await requireOwnedRecord({
      model: prisma.incomeSource,
      idField: "incomeId",
      id: req.params.id,
      userId: req.user.userId,
    });
    await prisma.incomeSource.delete({ where: { incomeId: req.params.id } });
    return res.status(204).send();
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
