process.env.JWT_SECRET = "test-secret";

const request = require("supertest");
const jwt = require("jsonwebtoken");

const prisma = require("../../db/client");
const app = require("../../app");

jest.mock("../../db/client", () => ({
  user: { findUnique: jest.fn() },
  asset: {
    findMany: jest.fn(),
    create: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    aggregate: jest.fn(),
  },
  savingsGoal: { aggregate: jest.fn() },
  netWorthSnapshot: { findMany: jest.fn(), upsert: jest.fn() },
}));

const alice = {
  userId: "11111111-1111-4111-8111-111111111111",
  name: "Alice",
  email: "alice@example.com",
  role: "user",
  deletedAt: null,
};
const bob = { ...alice, userId: "22222222-2222-4222-8222-222222222222", email: "bob@example.com" };
const asset = {
  assetId: "33333333-3333-4333-8333-333333333333",
  userId: alice.userId,
  assetType: "savings",
  assetName: "Cash",
  currentValue: "1000.00",
  lastUpdated: new Date("2026-09-07T00:00:00.000Z"),
  createdAt: new Date("2026-09-07T00:00:00.000Z"),
};
const goalAggregate = { _sum: { currentAmount: "500.00" } };

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
  prisma.asset.findMany.mockResolvedValue([]);
  prisma.savingsGoal.aggregate.mockResolvedValue(goalAggregate);
  prisma.asset.aggregate.mockImplementation(async ({ where }) => ({
    _sum: { currentValue: where.assetType === "investment" ? "0.00" : "1000.00" },
  }));
});

describe("assets", () => {
  test("creates, lists, updates, and deletes assets", async () => {
    prisma.asset.create.mockResolvedValue(asset);
    prisma.asset.findUnique.mockResolvedValue(asset);
    prisma.asset.update.mockResolvedValue({ ...asset, assetName: "Updated Cash" });

    const body = { assetType: "savings", assetName: "Cash", currentValue: "1000.00" };
    const created = await request(app).post("/api/assets").set(auth()).send(body);
    const listed = await request(app).get("/api/assets").set(auth());
    const updated = await request(app).put(`/api/assets/${asset.assetId}`).set(auth()).send({
      ...body, assetName: "Updated Cash",
    });
    const deleted = await request(app).delete(`/api/assets/${asset.assetId}`).set(auth());

    expect(created.status).toBe(201);
    expect(listed.status).toBe(200);
    expect(updated.status).toBe(200);
    expect(deleted.status).toBe(204);
  });

  test("rejects access to another user's asset", async () => {
    prisma.asset.findUnique.mockResolvedValue({ ...asset, userId: bob.userId });

    const response = await request(app)
      .put(`/api/assets/${asset.assetId}`)
      .set(auth())
      .send({ assetType: "savings", assetName: "Cash", currentValue: "1000.00" });

    expect(response.status).toBe(403);
    expect(prisma.asset.update).not.toHaveBeenCalled();
  });
});

describe("net worth", () => {
  test("computes assets plus savings goals", async () => {
    const response = await request(app).get("/api/networth").set(auth());

    expect(response.status).toBe(200);
    expect(response.body.data).toEqual({
      totalAssets: "1000.00",
      totalSavings: "500.00",
      totalInvestments: "0.00",
      netWorth: "1500.00",
    });
  });

  test("upserts the current day's snapshot", async () => {
    prisma.netWorthSnapshot.upsert.mockResolvedValue({
      snapshotId: "44444444-4444-4444-8444-444444444444",
      userId: alice.userId,
      snapshotDate: new Date("2026-09-07T00:00:00.000Z"),
      totalAssets: "1000.00",
      totalSavings: "500.00",
      totalInvestments: "0.00",
      netWorth: "1500.00",
    });

    const first = await request(app).post("/api/networth/snapshot").set(auth());
    const second = await request(app).post("/api/networth/snapshot").set(auth());

    expect(first.status).toBe(201);
    expect(second.status).toBe(201);
    expect(prisma.netWorthSnapshot.upsert).toHaveBeenCalledTimes(2);
    expect(prisma.netWorthSnapshot.upsert.mock.calls[0][0].where.userId_snapshotDate.userId)
      .toBe(alice.userId);
  });

  test("returns ordered, date-filtered snapshot history", async () => {
    const snapshots = [
      { snapshotDate: new Date("2026-09-01T00:00:00.000Z"), netWorth: "1000.00" },
      { snapshotDate: new Date("2026-09-07T00:00:00.000Z"), netWorth: "1500.00" },
    ];
    prisma.netWorthSnapshot.findMany.mockResolvedValue(snapshots);

    const response = await request(app)
      .get("/api/networth/history?from=2026-09-01&to=2026-09-07")
      .set(auth());

    expect(response.status).toBe(200);
    expect(response.body.data).toHaveLength(2);
    expect(prisma.netWorthSnapshot.findMany).toHaveBeenCalledWith(expect.objectContaining({
      orderBy: { snapshotDate: "asc" },
    }));
  });
});
