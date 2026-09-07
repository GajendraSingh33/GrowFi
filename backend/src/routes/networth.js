const express = require("express");
const prisma = require("../db/client");
const { requireAuth } = require("../middleware/auth");
const { computeNetWorth } = require("../services/netWorth");
const { parse, historyQuery, utcDate, todayUtc } = require("../validators/assets");

const router = express.Router();
router.use(requireAuth);

router.get("/", async (req, res, next) => {
  try {
    return res.json({ data: await computeNetWorth(prisma, req.user.userId) });
  } catch (error) {
    return next(error);
  }
});

router.get("/history", async (req, res, next) => {
  try {
    const query = parse(historyQuery, req.query);
    const snapshots = await prisma.netWorthSnapshot.findMany({
      where: {
        userId: req.user.userId,
        ...(query.from || query.to
          ? {
              snapshotDate: {
                ...(query.from ? { gte: utcDate(query.from) } : {}),
                ...(query.to ? { lte: utcDate(query.to) } : {}),
              },
            }
          : {}),
      },
      orderBy: { snapshotDate: "asc" },
    });
    return res.json({ data: snapshots });
  } catch (error) {
    return next(error);
  }
});

router.post("/snapshot", async (req, res, next) => {
  try {
    // Phase 1: users may manually trigger today's snapshot, such as on dashboard view.
    const snapshotDate = utcDate(todayUtc());
    const totals = await computeNetWorth(prisma, req.user.userId);
    const snapshot = await prisma.netWorthSnapshot.upsert({
      where: {
        userId_snapshotDate: {
          userId: req.user.userId,
          snapshotDate,
        },
      },
      create: {
        userId: req.user.userId,
        snapshotDate,
        totalAssets: totals.totalAssets,
        totalSavings: totals.totalSavings,
        totalInvestments: totals.totalInvestments,
        netWorth: totals.netWorth,
      },
      update: {
        totalAssets: totals.totalAssets,
        totalSavings: totals.totalSavings,
        totalInvestments: totals.totalInvestments,
        netWorth: totals.netWorth,
      },
    });
    return res.status(201).json({ data: snapshot });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
