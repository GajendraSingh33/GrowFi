const { z } = require("zod");
const AppError = require("../utils/AppError");

const pagination = {
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
};

const usersQuery = z.object({
  ...pagination,
  role: z.enum(["user", "admin"]).optional(),
  includeDeleted: z.enum(["true", "false"]).transform((value) => value === "true").default("false"),
  search: z.string().trim().max(255).optional(),
}).strict();

const feedbackQuery = z.object({
  ...pagination,
  status: z.enum(["open", "in_progress", "resolved"]).optional(),
}).strict();

const userUpdate = z.object({
  role: z.enum(["user", "admin"]).optional(),
  deletedAt: z.string().datetime({ offset: true }).nullable().optional(),
}).strict().refine((value) => Object.keys(value).length > 0, {
  message: "At least one field is required",
});

const feedbackUpdate = z.object({
  status: z.enum(["open", "in_progress", "resolved"]),
  force: z.boolean().optional().default(false),
}).strict();

const analyticsQuery = z.object({
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must use YYYY-MM-DD").optional(),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must use YYYY-MM-DD").optional(),
}).strict();

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

module.exports = {
  usersQuery,
  feedbackQuery,
  userUpdate,
  feedbackUpdate,
  analyticsQuery,
  parse,
};
