process.env.JWT_SECRET = "test-secret";

const express = require("express");
const request = require("supertest");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");

const users = new Map();
const prisma = require("../../db/client");
const app = require("../../app");
const { requireAuth, requireAdmin } = require("../../middleware/auth");
const errorHandler = require("../../middleware/errorHandler");

jest.mock("../../db/client", () => ({
  user: {
    create: jest.fn(),
    findUnique: jest.fn(),
  },
}));

const adminTestApp = express();
adminTestApp.use(express.json());
adminTestApp.get("/api/admin/test", requireAuth, requireAdmin, (req, res) => {
  res.json({ data: { ok: true } });
});
adminTestApp.use(errorHandler);

function makeUser(overrides = {}) {
  return {
    userId: overrides.userId || "11111111-1111-4111-8111-111111111111",
    name: overrides.name || "Asha",
    email: overrides.email || "asha@example.com",
    passwordHash: overrides.passwordHash || bcrypt.hashSync("Password1", 12),
    role: overrides.role || "user",
    createdAt: new Date("2026-09-06T00:00:00.000Z"),
    updatedAt: new Date("2026-09-06T00:00:00.000Z"),
    deletedAt: overrides.deletedAt || null,
  };
}

function tokenFor(user, options = {}) {
  return jwt.sign({ role: user.role }, process.env.JWT_SECRET, {
    subject: user.userId,
    expiresIn: options.expiresIn || "24h",
  });
}

beforeEach(() => {
  users.clear();
  jest.clearAllMocks();
  prisma.user.create.mockImplementation(async ({ data }) => {
    if (users.has(data.email)) {
      const error = new Error("duplicate");
      error.code = "P2002";
      throw error;
    }
    const user = makeUser({
      email: data.email,
      name: data.name,
      passwordHash: data.passwordHash,
    });
    users.set(user.email, user);
    return user;
  });
  prisma.user.findUnique.mockImplementation(async ({ where }) => users.get(where.email)
    || [...users.values()].find((user) => user.userId === where.userId)
    || null);
});

describe("auth API", () => {
  test("registers a user and returns the documented envelope", async () => {
    const response = await request(app)
      .post("/api/auth/register")
      .send({ name: "Asha", email: "Asha@Example.com", password: "Password1" });

    expect(response.status).toBe(201);
    expect(response.body.data.user).toMatchObject({
      name: "Asha",
      email: "asha@example.com",
      role: "user",
      deletedAt: null,
    });
    expect(response.body.data.user).not.toHaveProperty("passwordHash");
    expect(response.body.data.token).toEqual(expect.any(String));
  });

  test("rejects duplicate email with a conflict envelope", async () => {
    users.set("asha@example.com", makeUser());

    const response = await request(app)
      .post("/api/auth/register")
      .send({ name: "Asha", email: "asha@example.com", password: "Password1" });

    expect(response.status).toBe(409);
    expect(response.body).toEqual({
      error: {
        code: "EMAIL_ALREADY_EXISTS",
        message: "An account with this email already exists",
      },
    });
  });

  test("rejects passwords without a number using the standard validation envelope", async () => {
    const response = await request(app)
      .post("/api/auth/register")
      .send({ name: "Asha", email: "asha@example.com", password: "Password" });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
  });

  test("logs in without revealing whether an email or password is wrong", async () => {
    users.set("asha@example.com", makeUser());

    const wrongPassword = await request(app)
      .post("/api/auth/login")
      .send({ email: "asha@example.com", password: "Wrongpass1" });
    const unknownEmail = await request(app)
      .post("/api/auth/login")
      .send({ email: "unknown@example.com", password: "Wrongpass1" });

    expect(wrongPassword.status).toBe(401);
    expect(unknownEmail.status).toBe(401);
    expect(wrongPassword.body).toEqual(unknownEmail.body);
  });

  test("logs in with a JWT and expiry metadata", async () => {
    users.set("asha@example.com", makeUser());

    const response = await request(app)
      .post("/api/auth/login")
      .send({ email: "asha@example.com", password: "Password1" });

    expect(response.status).toBe(200);
    expect(response.body.data.expiresIn).toBe(86400);
    expect(response.body.data.user.email).toBe("asha@example.com");
    expect(response.body.data.token).toEqual(expect.any(String));
  });

  test("returns the current user from a valid token", async () => {
    const user = makeUser();
    users.set(user.email, user);

    const response = await request(app)
      .get("/api/auth/me")
      .set("Authorization", `Bearer ${tokenFor(user)}`);

    expect(response.status).toBe(200);
    expect(response.body.data.user).toMatchObject({
      userId: user.userId,
      email: user.email,
      role: "user",
    });
  });

  test("logs out with 204 for a valid token", async () => {
    const user = makeUser();
    users.set(user.email, user);

    const response = await request(app)
      .post("/api/auth/logout")
      .set("Authorization", `Bearer ${tokenFor(user)}`);

    expect(response.status).toBe(204);
    expect(response.text).toBe("");
  });

  test("rejects missing and expired tokens", async () => {
    const user = makeUser();
    users.set(user.email, user);

    const missing = await request(app).get("/api/auth/me");
    const expired = await request(app)
      .get("/api/auth/me")
      .set("Authorization", `Bearer ${tokenFor(user, { expiresIn: -1 })}`);

    expect(missing.status).toBe(401);
    expect(expired.status).toBe(401);
    expect(missing.body.error.code).toBe("UNAUTHORIZED");
    expect(expired.body.error.code).toBe("UNAUTHORIZED");
  });

  test("rejects a non-admin from an admin-only route", async () => {
    const user = makeUser();
    users.set(user.email, user);

    const response = await request(adminTestApp)
      .get("/api/admin/test")
      .set("Authorization", `Bearer ${tokenFor(user)}`);

    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe("FORBIDDEN");
  });
});
