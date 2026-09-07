process.env.JWT_SECRET = "test-secret";

const request = require("supertest");
const jwt = require("jsonwebtoken");

const prisma = require("../../db/client");
const app = require("../../app");

jest.mock("../../db/client", () => ({
  user: { findUnique: jest.fn() },
  habit: {
    findMany: jest.fn(),
    create: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  habitLog: {
    findMany: jest.fn(),
    upsert: jest.fn(),
    count: jest.fn(),
    findUnique: jest.fn(),
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
const habit = {
  habitId: "33333333-3333-4333-8333-333333333333",
  userId: alice.userId,
  name: "Read",
  frequency: "daily",
  targetValue: null,
  startDate: new Date("2026-09-01T00:00:00.000Z"),
  isActive: true,
  createdAt: new Date("2026-09-01T00:00:00.000Z"),
};
const otherHabit = { ...habit, habitId: "44444444-4444-4444-8444-444444444444", userId: bob.userId };
const log = {
  logId: "55555555-5555-4555-8555-555555555555",
  habitId: habit.habitId,
  logDate: new Date("2026-09-06T00:00:00.000Z"),
  status: "completed",
  createdAt: new Date("2026-09-06T00:00:00.000Z"),
};

function tokenFor(user = alice) {
  return jwt.sign({ role: user.role }, process.env.JWT_SECRET, {
    subject: user.userId,
    expiresIn: "24h",
  });
}

function auth(user = alice) {
  return { Authorization: `Bearer ${tokenFor(user)}` };
}

beforeEach(() => {
  jest.clearAllMocks();
  prisma.user.findUnique.mockImplementation(async ({ where }) => {
    if (where.userId === alice.userId) return alice;
    if (where.userId === bob.userId) return bob;
    return null;
  });
  prisma.habitLog.findMany.mockResolvedValue([]);
  prisma.habitLog.count.mockResolvedValue(0);
});

describe("habits", () => {
  test("creates, lists, updates, and soft-deletes a habit", async () => {
    prisma.habit.create.mockResolvedValue(habit);
    prisma.habit.findMany.mockResolvedValue([habit]);
    prisma.habit.findUnique.mockResolvedValue(habit);
    prisma.habit.update.mockResolvedValue({ ...habit, name: "Read more" });

    const body = {
      name: "Read", frequency: "daily", startDate: "2026-09-01", isActive: true,
    };
    const created = await request(app).post("/api/habits").set(auth()).send(body);
    const listed = await request(app).get("/api/habits").set(auth());
    const updated = await request(app).put(`/api/habits/${habit.habitId}`).set(auth()).send({
      ...body, name: "Read more",
    });
    const deleted = await request(app).delete(`/api/habits/${habit.habitId}`).set(auth());

    expect(created.status).toBe(201);
    expect(created.body.data.streakCount).toBe(0);
    expect(listed.status).toBe(200);
    expect(listed.body.data[0].streakCount).toBe(0);
    expect(updated.status).toBe(200);
    expect(deleted.status).toBe(204);
    expect(prisma.habit.update).toHaveBeenLastCalledWith({
      where: { habitId: habit.habitId },
      data: { isActive: false },
    });
  });

  test("returns 403 for another user's habit", async () => {
    prisma.habit.findUnique.mockResolvedValue(otherHabit);

    const response = await request(app)
      .put(`/api/habits/${otherHabit.habitId}`)
      .set(auth())
      .send({ name: "Read", frequency: "daily", startDate: "2026-09-01", isActive: true });

    expect(response.status).toBe(403);
    expect(prisma.habit.update).not.toHaveBeenCalled();
  });
});

describe("habit logs", () => {
  test("upserts a same-day log instead of creating a duplicate", async () => {
    prisma.habit.findUnique.mockResolvedValue(habit);
    prisma.habitLog.upsert
      .mockResolvedValueOnce(log)
      .mockResolvedValueOnce({ ...log, status: "missed" });

    const first = await request(app).post(`/api/habits/${habit.habitId}/log`)
      .set(auth()).send({ logDate: "2026-09-06", status: "completed" });
    const second = await request(app).post(`/api/habits/${habit.habitId}/log`)
      .set(auth()).send({ logDate: "2026-09-06", status: "missed" });

    expect(first.status).toBe(201);
    expect(second.status).toBe(201);
    expect(prisma.habitLog.upsert).toHaveBeenCalledTimes(2);
    expect(prisma.habitLog.upsert.mock.calls[1][0].update).toEqual({ status: "missed" });
  });

  test("rejects future-dated logs", async () => {
    prisma.habit.findUnique.mockResolvedValue(habit);
    const response = await request(app).post(`/api/habits/${habit.habitId}/log`)
      .set(auth()).send({ logDate: "2999-01-01", status: "completed" });

    expect(response.status).toBe(400);
    expect(prisma.habitLog.upsert).not.toHaveBeenCalled();
  });

  test("returns 403 for another user's habit logs", async () => {
    prisma.habit.findUnique.mockResolvedValue(otherHabit);
    const response = await request(app).get(`/api/habits/${otherHabit.habitId}/logs`).set(auth());
    expect(response.status).toBe(403);
  });

  test("deletes an owned log while preserving the habit", async () => {
    prisma.habit.findUnique.mockResolvedValue(habit);
    prisma.habitLog.findUnique.mockResolvedValue(log);

    const response = await request(app)
      .delete(`/api/habits/${habit.habitId}/logs/${log.logId}`)
      .set(auth());

    expect(response.status).toBe(204);
    expect(prisma.habitLog.delete).toHaveBeenCalledWith({ where: { logId: log.logId } });
  });
});
