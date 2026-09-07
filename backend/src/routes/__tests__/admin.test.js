process.env.JWT_SECRET = "test-secret";

const request = require("supertest");
const jwt = require("jsonwebtoken");
const prisma = require("../../db/client");
const app = require("../../app");

jest.mock("../../db/client", () => ({
  user: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    update: jest.fn(),
  },
  adminFeedback: {
    findMany: jest.fn(),
    count: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  expense: { findMany: jest.fn() },
  habitLog: { findMany: jest.fn() },
  habit: { findMany: jest.fn() },
  savingsGoal: { findMany: jest.fn() },
}));

const admin = {
  userId: "11111111-1111-4111-8111-111111111111",
  name: "Admin",
  email: "admin@example.com",
  role: "admin",
  createdAt: new Date("2026-09-01T00:00:00.000Z"),
  updatedAt: new Date("2026-09-01T00:00:00.000Z"),
  deletedAt: null,
};
const regularUser = { ...admin, userId: "22222222-2222-4222-8222-222222222222", role: "user" };

function tokenFor(user) {
  return jwt.sign({ role: user.role }, process.env.JWT_SECRET, {
    subject: user.userId,
    expiresIn: "24h",
  });
}

function auth(user = admin) {
  return { Authorization: `Bearer ${tokenFor(user)}` };
}

beforeEach(() => {
  jest.clearAllMocks();
  prisma.user.findUnique.mockResolvedValue(admin);
  prisma.user.findMany.mockResolvedValue([admin]);
  prisma.user.count.mockResolvedValue(1);
  prisma.user.update.mockResolvedValue({ ...admin, role: "user" });
  prisma.adminFeedback.findMany.mockResolvedValue([]);
  prisma.adminFeedback.count.mockResolvedValue(0);
  prisma.adminFeedback.findUnique.mockResolvedValue(null);
  prisma.adminFeedback.update.mockResolvedValue({
    feedbackId: "44444444-4444-4444-8444-444444444444",
    userId: regularUser.userId,
    subject: "Help",
    message: "Message",
    status: "resolved",
    createdAt: new Date("2026-09-01T00:00:00.000Z"),
    resolvedAt: new Date("2026-09-07T00:00:00.000Z"),
  });
  prisma.expense.findMany.mockResolvedValue([]);
  prisma.habitLog.findMany.mockResolvedValue([]);
  prisma.habit.findMany.mockResolvedValue([]);
  prisma.savingsGoal.findMany.mockResolvedValue([]);
});

test.each([
  ["/api/admin/users"],
  ["/api/admin/users/11111111-1111-4111-8111-111111111111"],
  ["/api/admin/feedback"],
  ["/api/admin/analytics"],
])("rejects a non-admin from %s", async (path) => {
  prisma.user.findUnique.mockResolvedValue(regularUser);
  const response = await request(app).get(path).set(auth(regularUser));
  expect(response.status).toBe(403);
});

test("rejects a non-admin from user and feedback updates", async () => {
  prisma.user.findUnique.mockResolvedValue(regularUser);
  const userResponse = await request(app)
    .patch(`/api/admin/users/${admin.userId}`)
    .set(auth(regularUser))
    .send({ role: "user" });
  const feedbackResponse = await request(app)
    .patch("/api/admin/feedback/44444444-4444-4444-8444-444444444444")
    .set(auth(regularUser))
    .send({ status: "resolved" });
  expect(userResponse.status).toBe(403);
  expect(feedbackResponse.status).toBe(403);
});

test("admin can list and update users and feedback", async () => {
  const usersResponse = await request(app).get("/api/admin/users?search=admin").set(auth());
  const updateResponse = await request(app)
    .patch(`/api/admin/users/${regularUser.userId}`)
    .set(auth())
    .send({ role: "admin", deletedAt: null });
  prisma.adminFeedback.findUnique.mockResolvedValue({
    feedbackId: "44444444-4444-4444-8444-444444444444",
    status: "open",
  });
  const feedbackResponse = await request(app)
    .patch("/api/admin/feedback/44444444-4444-4444-8444-444444444444")
    .set(auth())
    .send({ status: "resolved" });

  expect(usersResponse.status).toBe(200);
  expect(usersResponse.body.data.items[0].passwordHash).toBeUndefined();
  expect(updateResponse.status).toBe(200);
  expect(feedbackResponse.status).toBe(200);
  expect(prisma.adminFeedback.update.mock.calls[0][0].data.resolvedAt).toBeInstanceOf(Date);
});

test("prevents an admin from demoting their own account", async () => {
  const response = await request(app)
    .patch(`/api/admin/users/${admin.userId}`)
    .set(auth())
    .send({ role: "user" });
  expect(response.status).toBe(400);
  expect(response.body.error.code).toBe("SELF_DEMOTION_FORBIDDEN");
});

test("requires force to reopen resolved feedback", async () => {
  prisma.adminFeedback.findUnique.mockResolvedValue({ feedbackId: "x", status: "resolved" });
  const response = await request(app)
    .patch("/api/admin/feedback/x")
    .set(auth())
    .send({ status: "open" });
  expect(response.status).toBe(409);
  expect(response.body.error.code).toBe("FEEDBACK_STATE_CONFLICT");
});

test("returns zero-valued analytics for an empty dataset", async () => {
  const response = await request(app).get("/api/admin/analytics").set(auth());
  expect(response.status).toBe(200);
  expect(response.body.data).toMatchObject({
    activeUsers: 0,
    habitCompletionRate: 0,
    averageGoalCompletionRate: 0,
    engagementRate: 0,
  });
  for (const value of Object.values(response.body.data).slice(2)) {
    expect(typeof value).toBe("number");
  }
});
