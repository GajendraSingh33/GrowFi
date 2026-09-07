const express = require("express");
const prisma = require("../db/client");
const { requireAuth } = require("../middleware/auth");
const { requireOwnedRecord } = require("../utils/ownership");
const { utcDate } = require("../validators/finance");
const { goalBody, goalQuery, parse, rejectPastTargetDate } = require("../validators/goals");

const router = express.Router();
router.use(requireAuth);

function percentComplete(goal) {
  return Math.min(100, Math.round((Number(goal.currentAmount) / Number(goal.targetAmount)) * 1000) / 10);
}

function withPercentComplete(goal) {
  return { ...goal, percentComplete: percentComplete(goal) };
}

function goalData(input, userId) {
  return {
    goalName: input.goalName,
    targetAmount: input.targetAmount,
    currentAmount: input.currentAmount,
    targetDate: input.targetDate ? utcDate(input.targetDate) : null,
    status: input.status,
    ...(userId ? { userId } : {}),
  };
}

router.get("/", async (req, res, next) => {
  try {
    const query = parse(goalQuery, req.query);
    const goals = await prisma.savingsGoal.findMany({
      where: { userId: req.user.userId, ...(query.status ? { status: query.status } : {}) },
      orderBy: { createdAt: "desc" },
    });
    return res.json({ data: goals.map(withPercentComplete) });
  } catch (error) {
    return next(error);
  }
});

router.post("/", async (req, res, next) => {
  try {
    const input = parse(goalBody, req.body);
    rejectPastTargetDate(input.targetDate);
    const status = Number(input.currentAmount) >= Number(input.targetAmount)
      ? "completed"
      : input.status;
    const goal = await prisma.savingsGoal.create({
      data: { ...goalData(input, req.user.userId), status },
    });
    return res.status(201).json({ data: withPercentComplete(goal) });
  } catch (error) {
    return next(error);
  }
});

router.put("/:id", async (req, res, next) => {
  try {
    const input = parse(goalBody, req.body);
    rejectPastTargetDate(input.targetDate);
    const existing = await requireOwnedRecord({
      model: prisma.savingsGoal,
      idField: "goalId",
      id: req.params.id,
      userId: req.user.userId,
    });
    const status = Number(input.currentAmount) >= Number(input.targetAmount)
      ? "completed"
      : input.status;
    const goal = await prisma.savingsGoal.update({
      where: { goalId: existing.goalId },
      data: { ...goalData(input), status },
    });
    return res.json({ data: withPercentComplete(goal) });
  } catch (error) {
    return next(error);
  }
});

router.delete("/:id", async (req, res, next) => {
  try {
    const goal = await requireOwnedRecord({
      model: prisma.savingsGoal,
      idField: "goalId",
      id: req.params.id,
      userId: req.user.userId,
    });
    await prisma.savingsGoal.delete({ where: { goalId: goal.goalId } });
    return res.status(204).send();
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
