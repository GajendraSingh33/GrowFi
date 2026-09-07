process.env.JWT_SECRET = "test-secret";

const request = require("supertest");
const jwt = require("jsonwebtoken");

const prisma = require("../../db/client");
const app = require("../../app");
const frozenNow = new Date("2026-09-07T12:00:00.000Z");

jest.mock("../../db/client", () => ({
  user: { findUnique: jest.fn() },
  asset: { aggregate: jest.fn() },
  savingsGoal: { aggregate: jest.fn(), findMany: jest.fn() },
  incomeSource: { aggregate: jest.fn() },
  expense: { aggregate: jest.fn() },
  habit: { findMany: jest.fn() },
  habitLog: { findMany: jest.fn() },
}));

const user = {
  userId: "11111111-1111-4111-8111-111111111111",
  name: "Alice",
  email: "alice@example.com",
  role: "user",
  deletedAt: null,
};
const habit = {
  habitId: "22222222-2222-4222-8222-222222222222",
  userId: user.userId,
  name: "Read",
  frequency: "daily",
  targetValue: null,
  startDate: new Date("2026-09-01T00:00:00.000Z"),
  isActive: true,
  createdAt: new Date("2026-09-01T00:00:00.000Z"),
};
const goal = {
  goalId: "33333333-3333-4333-8333-333333333333",
  userId: user.userId,
  goalName: "Emergency fund",
  targetAmount: "1000.00",
  currentAmount: "250.00",
  targetDate: null,
  status: "active",
  createdAt: new Date("2026-09-01T00:00:00.000Z"),
  updatedAt: new Date("2026-09-01T00:00:00.000Z"),
};

function auth() {
  return {
    Authorization: `Bearer ${jwt.sign({ role: user.role }, process.env.JWT_SECRET, {
      subject: user.userId,
      expiresIn: "24h",
    })}`,
  };
}

beforeAll(() => {
  jest.useFakeTimers().setSystemTime(frozenNow);
});

afterAll(() => {
  jest.useRealTimers();
});

beforeEach(() => {
  jest.clearAllMocks();
  prisma.user.findUnique.mockResolvedValue(user);
  prisma.asset.aggregate.mockImplementation(async ({ where }) => ({
    _sum: { currentValue: where.assetType === "investment" ? "100.00" : "1000.00" },
  }));
  prisma.savingsGoal.aggregate.mockResolvedValue({ _sum: { currentAmount: "250.00" } });
  prisma.incomeSource.aggregate.mockResolvedValue({ _sum: { amount: "5000.00" } });
  prisma.expense.aggregate.mockResolvedValue({ _sum: { amount: "1200.00" } });
  prisma.habit.findMany.mockResolvedValue([habit]);
  prisma.habitLog.findMany.mockResolvedValue([
    { habitId: habit.habitId, logDate: frozenNow, status: "completed" },
  ]);
  prisma.savingsGoal.findMany.mockResolvedValue([goal]);
});

test("returns the dashboard aggregate from all four data sources", async () => {
  const response = await request(app).get("/api/dashboard").set(auth());

  expect(response.status).toBe(200);
  expect(response.body.data.netWorth).toMatchObject({
    totalAssets: "1000.00",
    totalSavings: "250.00",
    totalInvestments: "100.00",
    netWorth: "1250.00",
  });
  expect(response.body.data.incomeTotal).toBe("5000.00");
  expect(response.body.data.expenseTotal).toBe("1200.00");
  expect(response.body.data.habitSummary.habits[0]).toMatchObject({
    habitId: habit.habitId,
    name: "Read",
    streakCount: 1,
  });
  expect(response.body.data.habitSummary.completedTodayCount).toBe(1);
  expect(response.body.data.goals[0]).toMatchObject({
    goalId: goal.goalId,
    goalName: "Emergency fund",
    percentComplete: 25,
  });
});
