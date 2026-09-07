process.env.JWT_SECRET = "test-secret";

const request = require("supertest");
const jwt = require("jsonwebtoken");

const prisma = require("../../db/client");
const app = require("../../app");

jest.mock("../../db/client", () => ({
  user: { findUnique: jest.fn() },
  savingsGoal: {
    findMany: jest.fn(),
    create: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
}));

const alice = {
  userId: "11111111-1111-4111-8111-111111111111",
  name: "Alice",
  email: "alice@example.com",
  role: "user",
  deletedAt: null,
};
const bob = { ...alice, userId: "22222222-2222-4222-8222-222222222222", email: "bob@example.com" };
const goal = {
  goalId: "33333333-3333-4333-8333-333333333333",
  userId: alice.userId,
  goalName: "Emergency fund",
  targetAmount: "1000.00",
  currentAmount: "250.00",
  targetDate: new Date("2027-01-01T00:00:00.000Z"),
  status: "active",
  createdAt: new Date("2026-09-07T00:00:00.000Z"),
  updatedAt: new Date("2026-09-07T00:00:00.000Z"),
};

function auth(user = alice) {
  return {
    Authorization: `Bearer ${jwt.sign({ role: user.role }, process.env.JWT_SECRET, {
      subject: user.userId,
      expiresIn: "24h",
    })}`,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  prisma.user.findUnique.mockImplementation(async ({ where }) => {
    if (where.userId === alice.userId) return alice;
    if (where.userId === bob.userId) return bob;
    return null;
  });
  prisma.savingsGoal.findMany.mockResolvedValue([]);
});

describe("savings goals", () => {
  test("lists goals with one-decimal percentComplete and status filtering", async () => {
    prisma.savingsGoal.findMany.mockResolvedValue([goal, {
      ...goal,
      goalId: "44444444-4444-4444-8444-444444444444",
      currentAmount: "1250.00",
      status: "completed",
    }]);

    const response = await request(app).get("/api/goals?status=active").set(auth());

    expect(response.status).toBe(200);
    expect(response.body.data[0].percentComplete).toBe(25);
    expect(response.body.data[1].percentComplete).toBe(100);
    expect(prisma.savingsGoal.findMany).toHaveBeenCalledWith({
      where: { userId: alice.userId, status: "active" },
      orderBy: { createdAt: "desc" },
    });
  });

  test("creates a goal with default current amount and computed percentage", async () => {
    prisma.savingsGoal.create.mockResolvedValue(goal);

    const response = await request(app).post("/api/goals").set(auth()).send({
      goalName: "Emergency fund",
      targetAmount: "1000.00",
      targetDate: "2027-01-01",
    });

    expect(response.status).toBe(201);
    expect(response.body.data.percentComplete).toBe(25);
    expect(prisma.savingsGoal.create).toHaveBeenCalledWith({
      data: {
        goalName: "Emergency fund",
        targetAmount: "1000.00",
        currentAmount: "0.00",
        targetDate: new Date("2027-01-01T00:00:00.000Z"),
        status: "active",
        userId: alice.userId,
      },
    });
  });

  test("creates a completed goal when current amount reaches the target", async () => {
    prisma.savingsGoal.create.mockResolvedValue({
      ...goal,
      currentAmount: "1000.00",
      status: "completed",
    });

    const response = await request(app).post("/api/goals").set(auth()).send({
      goalName: "Completed fund",
      targetAmount: "1000.00",
      currentAmount: "1000.00",
      targetDate: "2027-01-01",
    });

    expect(response.status).toBe(201);
    expect(response.body.data.status).toBe("completed");
    expect(prisma.savingsGoal.create.mock.calls[0][0].data.status).toBe("completed");
  });

  test("rejects a past target date", async () => {
    const response = await request(app).post("/api/goals").set(auth()).send({
      goalName: "Old target",
      targetAmount: "100.00",
      targetDate: "2020-01-01",
    });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
    expect(prisma.savingsGoal.create).not.toHaveBeenCalled();
  });

  test("updates a goal and automatically completes it at the target", async () => {
    prisma.savingsGoal.findUnique.mockResolvedValue(goal);
    prisma.savingsGoal.update.mockResolvedValue({
      ...goal,
      currentAmount: "1000.00",
      status: "completed",
    });

    const response = await request(app).put(`/api/goals/${goal.goalId}`).set(auth()).send({
      goalName: "Emergency fund",
      targetAmount: "1000.00",
      currentAmount: "1000.00",
      targetDate: "2027-01-01",
      status: "active",
    });

    expect(response.status).toBe(200);
    expect(response.body.data.percentComplete).toBe(100);
    expect(response.body.data.status).toBe("completed");
    expect(prisma.savingsGoal.update.mock.calls[0][0].data.status).toBe("completed");
  });

  test("supports CRUD deletion and rejects access to another user's goal", async () => {
    prisma.savingsGoal.findUnique.mockResolvedValue({ ...goal, userId: bob.userId });

    const forbiddenUpdate = await request(app).put(`/api/goals/${goal.goalId}`).set(auth()).send({
      goalName: "Emergency fund",
      targetAmount: "1000.00",
      currentAmount: "500.00",
      targetDate: "2027-01-01",
      status: "active",
    });
    const forbiddenDelete = await request(app).delete(`/api/goals/${goal.goalId}`).set(auth());

    expect(forbiddenUpdate.status).toBe(403);
    expect(forbiddenDelete.status).toBe(403);
    expect(prisma.savingsGoal.update).not.toHaveBeenCalled();
    expect(prisma.savingsGoal.delete).not.toHaveBeenCalled();
  });

  test("deletes an owned goal", async () => {
    prisma.savingsGoal.findUnique.mockResolvedValue(goal);

    const response = await request(app).delete(`/api/goals/${goal.goalId}`).set(auth());

    expect(response.status).toBe(204);
    expect(prisma.savingsGoal.delete).toHaveBeenCalledWith({ where: { goalId: goal.goalId } });
  });
});
