const express = require("express");
const { requireAuth, requireAdmin } = require("../middleware/auth");
const prisma = require("../db/client");
const AppError = require("../utils/AppError");
const {
  usersQuery,
  feedbackQuery,
  userUpdate,
  feedbackUpdate,
  analyticsQuery,
  parse,
} = require("../validators/admin");

const router = express.Router();
router.use(requireAuth, requireAdmin);

const userSelect = {
  userId: true,
  name: true,
  email: true,
  role: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
};

function dateOnly(date) {
  return date.toISOString().slice(0, 10);
}

function utcStart(date) {
  return new Date(`${date}T00:00:00.000Z`);
}

function addPeriod(date, frequency) {
  const next = new Date(date);
  if (frequency === "daily") next.setUTCDate(next.getUTCDate() + 1);
  if (frequency === "weekly") next.setUTCDate(next.getUTCDate() + 7);
  if (frequency === "monthly") next.setUTCMonth(next.getUTCMonth() + 1);
  return next;
}

function periodKey(habit, date) {
  if (habit.frequency === "daily") return dateOnly(date);
  if (habit.frequency === "monthly") {
    return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
  }
  const start = new Date(habit.startDate);
  start.setUTCHours(0, 0, 0, 0);
  const days = Math.floor((date.getTime() - start.getTime()) / (24 * 60 * 60 * 1000));
  return String(Math.floor(days / 7));
}

function expectedOccurrences(habit, from, to) {
  let cursor = new Date(Math.max(habit.startDate.getTime(), from.getTime()));
  cursor.setUTCHours(0, 0, 0, 0);
  if (habit.frequency === "weekly") {
    const start = new Date(habit.startDate);
    start.setUTCHours(0, 0, 0, 0);
    const daysSinceStart = Math.floor((cursor.getTime() - start.getTime()) / (24 * 60 * 60 * 1000));
    cursor = new Date(start);
    cursor.setUTCDate(cursor.getUTCDate() + Math.floor(daysSinceStart / 7) * 7);
  }
  let total = 0;
  while (cursor < to) {
    total += 1;
    cursor = addPeriod(cursor, habit.frequency);
  }
  return total;
}

router.get("/users", async (req, res, next) => {
  try {
    const query = parse(usersQuery, req.query);
    const where = {
      ...(query.role ? { role: query.role } : {}),
      ...(query.includeDeleted ? {} : { deletedAt: null }),
      ...(query.search
        ? { OR: [{ name: { contains: query.search, mode: "insensitive" } }, { email: { contains: query.search, mode: "insensitive" } }] }
        : {}),
    };
    const skip = (query.page - 1) * query.pageSize;
    const [items, total] = await Promise.all([
      prisma.user.findMany({ where, select: userSelect, orderBy: { createdAt: "desc" }, skip, take: query.pageSize }),
      prisma.user.count({ where }),
    ]);
    return res.json({ data: { items, page: query.page, pageSize: query.pageSize, total } });
  } catch (error) {
    return next(error);
  }
});

router.get("/users/:id", async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({ where: { userId: req.params.id }, select: userSelect });
    if (!user) throw new AppError(404, "NOT_FOUND", "User not found");
    return res.json({ data: { user } });
  } catch (error) {
    return next(error);
  }
});

router.patch("/users/:id", async (req, res, next) => {
  try {
    const input = parse(userUpdate, req.body);
    if (req.user.userId === req.params.id && input.role === "user") {
      throw new AppError(400, "SELF_DEMOTION_FORBIDDEN", "An administrator cannot demote their own account");
    }
    const existing = await prisma.user.findUnique({ where: { userId: req.params.id }, select: { userId: true } });
    if (!existing) throw new AppError(404, "NOT_FOUND", "User not found");
    const user = await prisma.user.update({
      where: { userId: req.params.id },
      data: {
        ...(input.role ? { role: input.role } : {}),
        ...(input.deletedAt !== undefined ? { deletedAt: input.deletedAt } : {}),
      },
      select: userSelect,
    });
    return res.json({ data: { user } });
  } catch (error) {
    return next(error);
  }
});

router.get("/feedback", async (req, res, next) => {
  try {
    const query = parse(feedbackQuery, req.query);
    const where = query.status ? { status: query.status } : {};
    const skip = (query.page - 1) * query.pageSize;
    const [items, total] = await Promise.all([
      prisma.adminFeedback.findMany({ where, orderBy: { createdAt: "desc" }, skip, take: query.pageSize }),
      prisma.adminFeedback.count({ where }),
    ]);
    return res.json({ data: { items, page: query.page, pageSize: query.pageSize, total } });
  } catch (error) {
    return next(error);
  }
});

router.patch("/feedback/:id", async (req, res, next) => {
  try {
    const input = parse(feedbackUpdate, req.body);
    const existing = await prisma.adminFeedback.findUnique({ where: { feedbackId: req.params.id } });
    if (!existing) throw new AppError(404, "NOT_FOUND", "Feedback not found");
    if (existing.status === "resolved" && input.status === "open" && !input.force) {
      throw new AppError(409, "FEEDBACK_STATE_CONFLICT", "Reopening resolved feedback requires force=true");
    }
    const feedback = await prisma.adminFeedback.update({
      where: { feedbackId: req.params.id },
      data: {
        status: input.status,
        resolvedAt: input.status === "resolved" ? new Date() : null,
      },
    });
    return res.json({ data: feedback });
  } catch (error) {
    return next(error);
  }
});

router.get("/analytics", async (req, res, next) => {
  try {
    const query = parse(analyticsQuery, req.query);
    const to = query.to ? utcStart(query.to) : new Date();
    to.setUTCHours(0, 0, 0, 0);
    const from = query.from ? utcStart(query.from) : new Date(to.getTime() - (30 * 24 * 60 * 60 * 1000));
    if (from >= to) throw new AppError(400, "VALIDATION_ERROR", "from must be before to");
    const engagementFrom = new Date(to.getTime() - (7 * 24 * 60 * 60 * 1000));

    // TODO: Confirm active-user definition; Phase 1 uses expenses or habit logs in the last 30 days.
    // TODO: Confirm habit denominator; Phase 1 counts one expected occurrence per frequency period.
    // TODO: Confirm engagement definition; Phase 1 uses registered users with recent expense or habit-log activity.
    const [users, expenses, logs, habits, goals, engagementExpenses, engagementLogs] = await Promise.all([
      prisma.user.findMany({ where: { deletedAt: null }, select: { userId: true } }),
      prisma.expense.findMany({ where: { expenseDate: { gte: from, lt: to } }, select: { userId: true } }),
      prisma.habitLog.findMany({ where: { logDate: { gte: from, lt: to } }, select: { habitId: true, status: true, logDate: true, habit: { select: { userId: true } } } }),
      prisma.habit.findMany({ select: { habitId: true, userId: true, frequency: true, startDate: true } }),
      prisma.savingsGoal.findMany({ where: { status: { in: ["active", "completed"] } }, select: { currentAmount: true, targetAmount: true } }),
      prisma.expense.findMany({ where: { expenseDate: { gte: engagementFrom, lt: to } }, select: { userId: true } }),
      prisma.habitLog.findMany({ where: { logDate: { gte: engagementFrom, lt: to } }, select: { habit: { select: { userId: true } } } }),
    ]);
    const activeUserIds = new Set([...expenses.map((item) => item.userId), ...logs.map((item) => item.habit.userId)]);
    const engagementUserIds = new Set([...engagementExpenses.map((item) => item.userId), ...engagementLogs.map((item) => item.habit.userId)]);
    const habitsById = new Map(habits.map((habit) => [habit.habitId, habit]));
    const expected = habits.reduce((sum, habit) => sum + expectedOccurrences(habit, from, to), 0);
    const completedPeriods = new Set();
    for (const log of logs) {
      if (log.status !== "completed") continue;
      const habit = habitsById.get(log.habitId);
      if (habit) completedPeriods.add(`${log.habitId}:${periodKey(habit, log.logDate)}`);
    }
    const completed = completedPeriods.size;
    const averageGoal = goals.length
      ? goals.reduce((sum, goal) => {
        const targetAmount = Number(goal.targetAmount);
        const currentAmount = Number(goal.currentAmount);
        const completion = targetAmount === 0 ? 1 : Math.min(1, currentAmount / targetAmount);
        return sum + completion;
      }, 0) / goals.length
      : 0;
    return res.json({
      data: {
        from: dateOnly(from),
        to: dateOnly(to),
        activeUsers: activeUserIds.size,
        habitCompletionRate: expected ? completed / expected : 0,
        averageGoalCompletionRate: averageGoal,
        engagementRate: users.length ? engagementUserIds.size / users.length : 0,
      },
    });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
