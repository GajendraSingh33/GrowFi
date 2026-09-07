const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const prisma = require("../db/client");
const AppError = require("../utils/AppError");
const { requireAuth } = require("../middleware/auth");
const { registerSchema, loginSchema, parse } = require("../validators/auth");

const router = express.Router();
const TOKEN_EXPIRY_SECONDS = 24 * 60 * 60;

function jwtSecret() {
  if (!process.env.JWT_SECRET) {
    throw new AppError(500, "AUTH_CONFIGURATION_ERROR", "Authentication is not configured");
  }
  return process.env.JWT_SECRET;
}

function publicUser(user) {
  return {
    userId: user.userId,
    name: user.name,
    email: user.email,
    role: user.role,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    deletedAt: user.deletedAt,
  };
}

function tokenFor(user) {
  return jwt.sign({ role: user.role }, jwtSecret(), {
    subject: user.userId,
    expiresIn: TOKEN_EXPIRY_SECONDS,
  });
}

function prismaError(error) {
  if (error && error.code === "P2002") {
    return new AppError(409, "EMAIL_ALREADY_EXISTS", "An account with this email already exists");
  }
  return error;
}

router.post("/register", async (req, res, next) => {
  try {
    const input = parse(registerSchema, req.body);
    const passwordHash = await bcrypt.hash(input.password, 12);
    const user = await prisma.user.create({
      data: {
        name: input.name,
        email: input.email,
        passwordHash,
      },
    });

    return res.status(201).json({
      data: {
        user: publicUser(user),
        token: tokenFor(user),
      },
    });
  } catch (error) {
    return next(prismaError(error));
  }
});

router.post("/login", async (req, res, next) => {
  try {
    const input = parse(loginSchema, req.body);
    const user = await prisma.user.findUnique({ where: { email: input.email } });
    const passwordMatches = user
      ? await bcrypt.compare(input.password, user.passwordHash)
      : false;

    if (!user || !passwordMatches || user.deletedAt) {
      throw new AppError(401, "INVALID_CREDENTIALS", "Invalid email or password");
    }

    // Login analytics are best-effort and must never delay or break authentication.
    void prisma.loginEvent.create({ data: { userId: user.userId } }).catch(() => undefined);

    return res.status(200).json({
      data: {
        user: publicUser(user),
        token: tokenFor(user),
        expiresIn: TOKEN_EXPIRY_SECONDS,
      },
    });
  } catch (error) {
    return next(error);
  }
});

router.post("/logout", requireAuth, (req, res) => res.status(204).send());

router.get("/me", requireAuth, (req, res) => {
  res.status(200).json({ data: { user: publicUser(req.user) } });
});

module.exports = router;
