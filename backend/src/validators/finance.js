const { z } = require("zod");
const AppError = require("../utils/AppError");

const uuid = z.string().uuid();
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must use YYYY-MM-DD");
const amount = z.string().regex(/^\d+(\.\d{1,2})?$/, "Amount must be a positive decimal")
  .refine((value) => Number(value) > 0, "Amount must be positive");
const page = z.coerce.number().int().min(1).default(1);
const pageSize = z.coerce.number().int().min(1).max(100).default(25);

const incomeBody = z.object({
  sourceName: z.string().trim().min(1).max(120),
  amount,
  frequency: z.enum(["one_time", "weekly", "monthly", "yearly"]),
  receivedDate: date,
}).strict();

const categoryBody = z.object({
  name: z.string().trim().min(1).max(80),
  icon: z.string().max(50).nullable().optional(),
}).strict();

const expenseBody = z.object({
  categoryId: uuid,
  amount,
  description: z.string().max(255).nullable().optional(),
  expenseDate: date,
}).strict();

const listQuery = z.object({ page, pageSize }).strict();
const expenseQuery = z.object({
  categoryId: uuid.optional(),
  from: date.optional(),
  to: date.optional(),
  page,
  pageSize,
}).strict().refine(({ from, to }) => !from || !to || from <= to, {
  message: "from must be before or equal to to",
  path: ["to"],
});

const summaryQuery = z.object({
  month: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Month must use YYYY-MM").optional(),
  from: date.optional(),
  to: date.optional(),
}).strict().refine(({ month, from, to }) => Boolean(month) !== Boolean(from || to), {
  message: "Provide month or both from and to",
  path: ["month"],
}).refine(({ from, to }) => !from || !to || from <= to, {
  message: "from must be before or equal to to",
  path: ["to"],
});

function parse(schema, input) {
  const result = schema.safeParse(input);
  if (!result.success) {
    const details = {};
    for (const issue of result.error.issues) {
      details[issue.path.join(".") || "query"] = issue.message;
    }
    throw new AppError(400, "VALIDATION_ERROR", "Request validation failed", details);
  }
  return result.data;
}

function utcDate(value) {
  return new Date(`${value}T00:00:00.000Z`);
}

module.exports = {
  incomeBody,
  categoryBody,
  expenseBody,
  listQuery,
  expenseQuery,
  summaryQuery,
  parse,
  utcDate,
};
