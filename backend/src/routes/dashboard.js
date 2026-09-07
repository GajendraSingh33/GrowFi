const express = require("express");
const prisma = require("../db/client");
const { requireAuth } = require("../middleware/auth");
const { computeNetWorth } = require("../services/netWorth");
const { calculateCurrentStreak } = require("../services/habitStreak");

const router = express.Router();
router.use(requireAuth);

function monthBounds() {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth();
  return {
    month: `${year}-${String(month + 1).padStart(2, "0")}`,
    from: new Date(Date.UTC(year, month, 1)),
    to: new Date(Date.UTC(year, month + 1, 1)),
  };
}

function utcToday() {
  return new Date().toISOString().slice(0, 10);
}

function percentComplete(goal) {
  return Math.min(100, Math.round((Number(goal.currentAmount) / Number(goal.targetAmount)) * 1000) / 10);
}

router.get("/", async (req, res, next) => {
  try {
    const { month, from, to } = monthBounds();
    const userId = req.user.userId;
    const [netWorth, incomeTotal, expenseTotal, habits, goals] = await Promise.all([
      computeNetWorth(prisma, userId),
      prisma.incomeSource.aggregate({
        where: { userId, receivedDate: { gte: from, lt: to } },
        _sum: { amount: true },
      }),
      prisma.expense.aggregate({
        where: { userId, expenseDate: { gte: from, lt: to } },
        _sum: { amount: true },
      }),
      prisma.habit.findMany({
        where: { userId, isActive: true },
        orderBy: { createdAt: "desc" },
      }),
      prisma.savingsGoal.findMany({
        where: { userId, status: "active" },
        orderBy: { createdAt: "desc" },
      }),
    ]);

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
    const habitItems = habits.map((habit) => ({
      ...habit,
      streakCount: calculateCurrentStreak(logsByHabitId.get(habit.habitId) || [], habit.frequency),
    }));

    return res.json({
      data: {
        netWorth,
        month,
        incomeTotal: incomeTotal._sum.amount || "0.00",
        expenseTotal: expenseTotal._sum.amount || "0.00",
        habitSummary: {
          activeHabitCount: habitItems.length,
          activeStreakCount: habitItems.filter((habit) => habit.streakCount > 0).length,
          completedTodayCount: logs.filter((log) =>
            log.status === "completed" &&
            log.logDate.toISOString().slice(0, 10) === utcToday()).length,
          habits: habitItems,
        },
        goals: goals.map((goal) => ({ ...goal, percentComplete: percentComplete(goal) })),
      },
    });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
