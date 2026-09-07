const express = require("express");
const prisma = require("../db/client");
const AppError = require("../utils/AppError");
const { requireAuth } = require("../middleware/auth");
const { requireOwnedRecord } = require("../utils/ownership");
const { calculateCurrentStreak } = require("../services/habitStreak");
const { habitBody, habitLogBody, habitLogQuery, parse, rejectFutureDate } = require("../validators/habits");
const { utcDate } = require("../validators/finance");

const router = express.Router();
router.use(requireAuth);

function habitWithStreak(habit, logs = []) {
  return { ...habit, streakCount: calculateCurrentStreak(logs, habit.frequency) };
}

function habitData(input, userId) {
  return {
    name: input.name,
    frequency: input.frequency,
    targetValue: input.targetValue === undefined ? null : input.targetValue,
    startDate: utcDate(input.startDate),
    isActive: input.isActive,
    ...(userId ? { userId } : {}),
  };
}

router.get("/", async (req, res, next) => {
  try {
    const habits = await prisma.habit.findMany({
      where: { userId: req.user.userId },
      orderBy: { createdAt: "desc" },
    });
    const logs = await prisma.habitLog.findMany({
      where: { habitId: { in: habits.map((habit) => habit.habitId) } },
      select: { habitId: true, logDate: true, status: true },
      orderBy: { logDate: "desc" },
    });
    const logsByHabitId = new Map();
    for (const log of logs) {
      const habitLogs = logsByHabitId.get(log.habitId) || [];
      habitLogs.push(log);
      logsByHabitId.set(log.habitId, habitLogs);
    }
    const items = habits.map((habit) => habitWithStreak(habit, logsByHabitId.get(habit.habitId)));
    return res.json({ data: items });
  } catch (error) {
    return next(error);
  }
});

router.post("/", async (req, res, next) => {
  try {
    const input = parse(habitBody, req.body);
    const habit = await prisma.habit.create({
      data: habitData(input, req.user.userId),
    });
    return res.status(201).json({ data: { ...habit, streakCount: 0 } });
  } catch (error) {
    return next(error);
  }
});

router.put("/:id", async (req, res, next) => {
  try {
    const input = parse(habitBody, req.body);
    await requireOwnedRecord({
      model: prisma.habit,
      idField: "habitId",
      id: req.params.id,
      userId: req.user.userId,
    });
    const habit = await prisma.habit.update({
      where: { habitId: req.params.id },
      data: habitData(input),
    });
    const logs = await prisma.habitLog.findMany({
      where: { habitId: habit.habitId },
      select: { logDate: true, status: true },
      orderBy: { logDate: "desc" },
    });
    return res.json({ data: habitWithStreak(habit, logs) });
  } catch (error) {
    return next(error);
  }
});

router.delete("/:id", async (req, res, next) => {
  try {
    await requireOwnedRecord({
      model: prisma.habit,
      idField: "habitId",
      id: req.params.id,
      userId: req.user.userId,
    });
    await prisma.habit.update({
      where: { habitId: req.params.id },
      data: { isActive: false },
    });
    return res.status(204).send();
  } catch (error) {
    return next(error);
  }
});

router.post("/:id/log", async (req, res, next) => {
  try {
    const input = parse(habitLogBody, req.body);
    const habit = await requireOwnedRecord({
      model: prisma.habit,
      idField: "habitId",
      id: req.params.id,
      userId: req.user.userId,
    });
    const logDate = input.logDate || new Date().toISOString().slice(0, 10);
    rejectFutureDate(logDate);
    const log = await prisma.habitLog.upsert({
      where: { habitId_logDate: { habitId: habit.habitId, logDate: utcDate(logDate) } },
      create: { habitId: habit.habitId, logDate: utcDate(logDate), status: input.status },
      update: { status: input.status },
    });
    return res.status(201).json({ data: log });
  } catch (error) {
    return next(error);
  }
});

router.get("/:id/logs", async (req, res, next) => {
  try {
    const query = parse(habitLogQuery, req.query);
    const habit = await requireOwnedRecord({
      model: prisma.habit,
      idField: "habitId",
      id: req.params.id,
      userId: req.user.userId,
    });
    const where = {
      habitId: habit.habitId,
      ...(query.from || query.to
        ? { logDate: { ...(query.from ? { gte: utcDate(query.from) } : {}), ...(query.to ? { lte: utcDate(query.to) } : {}) } }
        : {}),
    };
    const [items, total] = await Promise.all([
      prisma.habitLog.findMany({
        where,
        orderBy: { logDate: "desc" },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      prisma.habitLog.count({ where }),
    ]);
    return res.json({ data: { items, page: query.page, pageSize: query.pageSize, total } });
  } catch (error) {
    return next(error);
  }
});

router.delete("/:id/logs/:logId", async (req, res, next) => {
  try {
    await requireOwnedRecord({
      model: prisma.habit,
      idField: "habitId",
      id: req.params.id,
      userId: req.user.userId,
    });
    const log = await prisma.habitLog.findUnique({ where: { logId: req.params.logId } });
    if (!log) {
      throw new AppError(404, "NOT_FOUND", "Habit log not found");
    }
    if (log.habitId !== req.params.id) {
      throw new AppError(403, "FORBIDDEN", "You do not have access to this resource");
    }
    await prisma.habitLog.delete({ where: { logId: log.logId } });
    return res.status(204).send();
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
