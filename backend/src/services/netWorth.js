async function computeNetWorth(prisma, userId) {
  const [assetTotal, investmentTotal, savingsTotal] = await Promise.all([
    prisma.asset.aggregate({
      where: { userId },
      _sum: { currentValue: true },
    }),
    prisma.asset.aggregate({
      where: { userId, assetType: "investment" },
      _sum: { currentValue: true },
    }),
    prisma.savingsGoal.aggregate({
      where: { userId },
      _sum: { currentAmount: true },
    }),
  ]);

  const totalAssets = assetTotal._sum.currentValue || "0.00";
  const totalInvestments = investmentTotal._sum.currentValue || "0.00";
  const totalSavings = savingsTotal._sum.currentAmount || "0.00";
  const netWorth = (Number(totalAssets) + Number(totalSavings)).toFixed(2);

  return {
    totalAssets,
    totalSavings,
    totalInvestments,
    netWorth,
  };
}

module.exports = { computeNetWorth };
