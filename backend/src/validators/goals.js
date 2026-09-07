const { z } = require("zod");
const AppError = require("../utils/AppError");
const { utcDate } = require("./finance");

const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must use YYYY-MM-DD");
const nonNegativeDecimal = z.string()
  .regex(/^\d+(\.\d{1,2})?$/, "Amount must be a non-negative decimal")
  .refine((value) => Number(value) >= 0, "Amount must be non-negative");
const positiveDecimal = nonNegativeDecimal.refine((value) => Number(value) > 0, "Amount must be positive");

const goalBody = z.object({
  goalName: z.string().trim().min(1).max(120),
  targetAmount: positiveDecimal,
  currentAmount: nonNegativeDecimal.default("0.00"),
  targetDate: date.nullable().optional(),
  status: z.enum(["active", "completed", "abandoned"]).default("active"),
}).strict();

const goalQuery = z.object({
  status: z.enum(["active", "completed", "abandoned"]).optional(),
}).strict();

function parse(schema, input) {
  const result = schema.safeParse(input);
  if (!result.success) {
    const details = {};
    for (const issue of result.error.issues) {
      details[issue.path.join(".") || "body"] = issue.message;
    }
    throw new AppError(400, "VALIDATION_ERROR", "Request validation failed", details);
  }
  return result.data;
}

function rejectPastTargetDate(value) {
  if (!value) return;
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  if (utcDate(value) <= today) {
    throw new AppError(400, "VALIDATION_ERROR", "Target date must be in the future");
  }
}

module.exports = { goalBody, goalQuery, parse, rejectPastTargetDate };
