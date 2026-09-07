process.env.JWT_SECRET = "test-secret";

const request = require("supertest");
const jwt = require("jsonwebtoken");

const prisma = require("../../db/client");
const app = require("../../app");

jest.mock("../../db/client", () => ({
  user: { findUnique: jest.fn() },
  incomeSource: {
    findMany: jest.fn(),
    count: jest.fn(),
    create: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  expenseCategory: {
    findMany: jest.fn(),
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    delete: jest.fn(),
  },
  expense: {
    findMany: jest.fn(),
    count: jest.fn(),
    create: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    groupBy: jest.fn(),
  },
}));

const alice = {
  userId: "11111111-1111-4111-8111-111111111111",
  name: "Alice",
  email: "alice@example.com",
  role: "user",
  deletedAt: null,
};
const bob = {
  userId: "22222222-2222-4222-8222-222222222222",
  name: "Bob",
  email: "bob@example.com",
  role: "user",
  deletedAt: null,
};
const defaultCategory = {
  categoryId: "33333333-3333-4333-8333-333333333333",
  userId: null,
  name: "Food",
  icon: null,
  isDefault: true,
};
const aliceCategory = {
  categoryId: "44444444-4444-4444-8444-444444444444",
  userId: alice.userId,
  name: "Subscriptions",
  icon: "repeat",
  isDefault: false,
};
const bobCategory = {
  categoryId: "55555555-5555-4555-8555-555555555555",
  userId: bob.userId,
  name: "Private",
  icon: null,
  isDefault: false,
};

function tokenFor(user) {
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
  prisma.incomeSource.findMany.mockResolvedValue([]);
  prisma.incomeSource.count.mockResolvedValue(0);
  prisma.expense.findMany.mockResolvedValue([]);
  prisma.expense.count.mockResolvedValue(0);
  prisma.expenseCategory.findMany.mockResolvedValue([defaultCategory]);
});

describe("expense categories", () => {
  test("lists default and current user's custom categories", async () => {
    prisma.expenseCategory.findMany.mockResolvedValue([defaultCategory, aliceCategory]);

    const response = await request(app).get("/api/expense-categories").set(auth());

    expect(response.status).toBe(200);
    expect(response.body.data).toEqual([defaultCategory, aliceCategory]);
    expect(prisma.expenseCategory.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { OR: [{ isDefault: true, userId: null }, { userId: alice.userId }] },
    }));
  });

  test("creates a custom category owned by the current user", async () => {
    prisma.expenseCategory.findFirst.mockResolvedValue(null);
    prisma.expenseCategory.create.mockResolvedValue(aliceCategory);

    const response = await request(app)
      .post("/api/expense-categories")
      .set(auth())
      .send({ name: "Subscriptions", icon: "repeat" });

    expect(response.status).toBe(201);
    expect(response.body.data).toEqual(aliceCategory);
    expect(prisma.expenseCategory.create).toHaveBeenCalledWith({
      data: { name: "Subscriptions", icon: "repeat", userId: alice.userId, isDefault: false },
    });
  });

  test("rejects duplicate custom category names case-insensitively", async () => {
    prisma.expenseCategory.findFirst.mockResolvedValue(aliceCategory);

    const response = await request(app)
      .post("/api/expense-categories")
      .set(auth())
      .send({ name: "subscriptions" });

    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe("CATEGORY_CONFLICT");
  });

  test("blocks deleting a category that has expenses", async () => {
    prisma.expenseCategory.findUnique.mockResolvedValue(aliceCategory);
    prisma.expense.count.mockResolvedValue(1);

    const response = await request(app)
      .delete(`/api/expense-categories/${aliceCategory.categoryId}`)
      .set(auth());

    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe("CATEGORY_IN_USE");
  });
});

describe("income", () => {
  test("creates, lists, updates, and deletes income", async () => {
    const income = {
      incomeId: "66666666-6666-4666-8666-666666666666",
      userId: alice.userId,
      sourceName: "Salary",
      amount: "5000.00",
      frequency: "monthly",
      receivedDate: "2026-09-01",
    };
    prisma.incomeSource.create.mockResolvedValue(income);
    prisma.incomeSource.findUnique.mockResolvedValue(income);
    prisma.incomeSource.update.mockResolvedValue({ ...income, amount: "5500.00" });

    const created = await request(app).post("/api/income").set(auth()).send({
      sourceName: "Salary", amount: "5000.00", frequency: "monthly", receivedDate: "2026-09-01",
    });
    const listed = await request(app).get("/api/income?page=1&pageSize=25").set(auth());
    const updated = await request(app).put(`/api/income/${income.incomeId}`).set(auth()).send({
      sourceName: "Salary", amount: "5500.00", frequency: "monthly", receivedDate: "2026-09-01",
    });
    const deleted = await request(app).delete(`/api/income/${income.incomeId}`).set(auth());

    expect(created.status).toBe(201);
    expect(listed.status).toBe(200);
    expect(updated.status).toBe(200);
    expect(deleted.status).toBe(204);
    expect(prisma.incomeSource.delete).toHaveBeenCalledWith({ where: { incomeId: income.incomeId } });
  });

  test("returns 403 when modifying another user's income", async () => {
    prisma.incomeSource.findUnique.mockResolvedValue({
      incomeId: "66666666-6666-4666-8666-666666666666",
      userId: bob.userId,
    });

    const response = await request(app)
      .delete("/api/income/66666666-6666-4666-8666-666666666666")
      .set(auth(alice));

    expect(response.status).toBe(403);
    expect(prisma.incomeSource.delete).not.toHaveBeenCalled();
  });

  test("returns 403 when updating another user's income", async () => {
    prisma.incomeSource.findUnique.mockResolvedValue({
      incomeId: "66666666-6666-4666-8666-666666666666",
      userId: bob.userId,
    });

    const response = await request(app)
      .put("/api/income/66666666-6666-4666-8666-666666666666")
      .set(auth(alice))
      .send({
        sourceName: "Salary", amount: "5500.00", frequency: "monthly", receivedDate: "2026-09-01",
      });

    expect(response.status).toBe(403);
    expect(prisma.incomeSource.update).not.toHaveBeenCalled();
  });
});

describe("expenses", () => {
  const expense = {
    expenseId: "77777777-7777-4777-8777-777777777777",
    userId: alice.userId,
    categoryId: defaultCategory.categoryId,
    amount: "25.50",
    description: "Lunch",
    expenseDate: "2026-09-06",
    category: defaultCategory,
  };

  test("creates, lists, updates, and deletes an expense", async () => {
    prisma.expenseCategory.findUnique.mockResolvedValue(defaultCategory);
    prisma.expense.create.mockResolvedValue(expense);
    prisma.expense.findUnique.mockResolvedValue(expense);
    prisma.expense.update.mockResolvedValue({ ...expense, amount: "30.00" });

    const created = await request(app).post("/api/expenses").set(auth()).send({
      categoryId: defaultCategory.categoryId, amount: "25.50",
      description: "Lunch", expenseDate: "2026-09-06",
    });
    const listed = await request(app).get("/api/expenses").set(auth());
    const updated = await request(app).put(`/api/expenses/${expense.expenseId}`).set(auth()).send({
      categoryId: defaultCategory.categoryId, amount: "30.00",
      description: "Dinner", expenseDate: "2026-09-06",
    });
    const deleted = await request(app).delete(`/api/expenses/${expense.expenseId}`).set(auth());

    expect(created.status).toBe(201);
    expect(listed.status).toBe(200);
    expect(updated.status).toBe(200);
    expect(deleted.status).toBe(204);
  });

  test("rejects another user's custom category", async () => {
    prisma.expenseCategory.findUnique.mockResolvedValue(bobCategory);

    const response = await request(app).post("/api/expenses").set(auth()).send({
      categoryId: bobCategory.categoryId, amount: "10.00", expenseDate: "2026-09-06",
    });

    expect(response.status).toBe(403);
    expect(prisma.expense.create).not.toHaveBeenCalled();
  });

  test("returns 403 when deleting another user's expense", async () => {
    prisma.expense.findUnique.mockResolvedValue({ ...expense, userId: bob.userId });

    const response = await request(app)
      .delete(`/api/expenses/${expense.expenseId}`)
      .set(auth(alice));

    expect(response.status).toBe(403);
    expect(prisma.expense.delete).not.toHaveBeenCalled();
  });

  test("returns 403 when updating another user's expense", async () => {
    prisma.expense.findUnique.mockResolvedValue({ ...expense, userId: bob.userId });

    const response = await request(app)
      .put(`/api/expenses/${expense.expenseId}`)
      .set(auth(alice))
      .send({
        categoryId: defaultCategory.categoryId, amount: "30.00",
        description: "Dinner", expenseDate: "2026-09-06",
      });

    expect(response.status).toBe(403);
    expect(prisma.expense.update).not.toHaveBeenCalled();
  });

  test("returns grouped totals for the requested month", async () => {
    prisma.expense.groupBy.mockResolvedValue([
      { categoryId: defaultCategory.categoryId, _sum: { amount: "25.50" } },
      { categoryId: aliceCategory.categoryId, _sum: { amount: "10.00" } },
    ]);
    prisma.expenseCategory.findMany.mockResolvedValue([defaultCategory, aliceCategory]);

    const response = await request(app)
      .get("/api/expenses/summary?month=2026-09")
      .set(auth());

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      data: {
        month: "2026-09",
        items: [
          { categoryId: defaultCategory.categoryId, name: "Food", totalAmount: "25.50" },
          { categoryId: aliceCategory.categoryId, name: "Subscriptions", totalAmount: "10.00" },
        ],
        totalAmount: "35.50",
      },
    });
  });
});
