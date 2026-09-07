const { z } = require("zod");
const AppError = require("../utils/AppError");
const { utcDate } = require("./finance");

const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must use YYYY-MM-DD");
const positiveDecimal = z.string()
  .regex(/^\d+(\.\d{1,2})?$/, "Value must be a positive decimal")
  .refine((value) => Number(value) > 0, "Value must be positive");

const habitBody = z.object({
  name: z.string().trim().min(1).max(120),
  frequency: z.enum(["daily", "weekly", "monthly"]),
  targetValue: positiveDecimal.nullable().optional(),
  startDate: date,
  isActive: z.boolean().default(true),
}).strict();

const habitLogBody = z.object({
  logDate: date.optional(),
  status: z.enum(["completed", "missed"]).default("completed"),
}).strict();

const habitLogQuery = z.object({
  from: date.optional(),
  to: date.optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
}).strict().refine(({ from, to }) => !from || !to || from <= to, {
  message: "from must be before or equal to to",
  path: ["to"],
});

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

function rejectFutureDate(value) {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  if (utcDate(value) > today) {
    throw new AppError(400, "VALIDATION_ERROR", "Log date cannot be in the future");
  }
}

module.exports = { habitBody, habitLogBody, habitLogQuery, parse, rejectFutureDate };
