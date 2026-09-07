const express = require("express");
const prisma = require("../db/client");
const { requireAuth } = require("../middleware/auth");
const { requireOwnedRecord } = require("../utils/ownership");
const { assetBody, parse, todayUtc, utcDate } = require("../validators/assets");

const router = express.Router();
router.use(requireAuth);

function assetData(input, userId) {
  return {
    assetType: input.assetType,
    assetName: input.assetName,
    currentValue: input.currentValue,
    lastUpdated: utcDate(input.lastUpdated || todayUtc()),
    ...(userId ? { userId } : {}),
  };
}

router.get("/", async (req, res, next) => {
  try {
    const items = await prisma.asset.findMany({
      where: { userId: req.user.userId },
      orderBy: { lastUpdated: "desc" },
    });
    return res.json({ data: items });
  } catch (error) {
    return next(error);
  }
});

router.post("/", async (req, res, next) => {
  try {
    const input = parse(assetBody, req.body);
    const item = await prisma.asset.create({
      data: assetData(input, req.user.userId),
    });
    return res.status(201).json({ data: item });
  } catch (error) {
    return next(error);
  }
});

router.put("/:id", async (req, res, next) => {
  try {
    const input = parse(assetBody, req.body);
    const asset = await requireOwnedRecord({
      model: prisma.asset,
      idField: "assetId",
      id: req.params.id,
      userId: req.user.userId,
    });
    const item = await prisma.asset.update({
      where: { assetId: asset.assetId },
      data: assetData(input),
    });
    return res.json({ data: item });
  } catch (error) {
    return next(error);
  }
});

router.delete("/:id", async (req, res, next) => {
  try {
    const asset = await requireOwnedRecord({
      model: prisma.asset,
      idField: "assetId",
      id: req.params.id,
      userId: req.user.userId,
    });
    await prisma.asset.delete({ where: { assetId: asset.assetId } });
    return res.status(204).send();
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
