const { z } = require("zod");
const AppError = require("../utils/AppError");
const { utcDate } = require("./finance");

const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must use YYYY-MM-DD");
const positiveDecimal = z.string()
  .regex(/^\d+(\.\d{1,2})?$/, "Value must be a positive decimal")
  .refine((value) => Number(value) > 0, "Value must be positive");

const assetBody = z.object({
  assetType: z.enum(["savings", "investment", "property", "other"]),
  assetName: z.string().trim().min(1).max(120),
  currentValue: positiveDecimal,
  lastUpdated: date.optional(),
}).strict();

const historyQuery = z.object({
  from: date.optional(),
  to: date.optional(),
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

function todayUtc() {
  return new Date().toISOString().slice(0, 10);
}

module.exports = { assetBody, historyQuery, parse, todayUtc, utcDate };
