const jwt = require("jsonwebtoken");
const prisma = require("../db/client");
const AppError = require("../utils/AppError");

function jwtSecret() {
  if (!process.env.JWT_SECRET) {
    throw new AppError(500, "AUTH_CONFIGURATION_ERROR", "Authentication is not configured");
  }
  return process.env.JWT_SECRET;
}

async function requireAuth(req, res, next) {
  try {
    const authorization = req.get("authorization");
    if (!authorization || !authorization.startsWith("Bearer ")) {
      throw new AppError(401, "UNAUTHORIZED", "Authentication is required");
    }

    const token = authorization.slice("Bearer ".length).trim();
    if (!token) {
      throw new AppError(401, "UNAUTHORIZED", "Authentication is required");
    }

    const payload = jwt.verify(token, jwtSecret());
    if (!payload.sub || typeof payload.sub !== "string") {
      throw new AppError(401, "UNAUTHORIZED", "Authentication is invalid");
    }

    const user = await prisma.user.findUnique({
      where: { userId: payload.sub },
      select: {
        userId: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        updatedAt: true,
        deletedAt: true,
      },
    });

    if (!user || user.deletedAt) {
      throw new AppError(401, "UNAUTHORIZED", "Authentication is invalid");
    }

    req.user = user;
    return next();
  } catch (error) {
    if (error instanceof AppError) {
      return next(error);
    }
    if (error.name === "TokenExpiredError" || error.name === "JsonWebTokenError") {
      return next(new AppError(401, "UNAUTHORIZED", "Authentication is invalid"));
    }
    return next(error);
  }
}

function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== "admin") {
    return next(new AppError(403, "FORBIDDEN", "Administrator access is required"));
  }
  return next();
}

module.exports = { requireAuth, requireAdmin };
