const { z } = require("zod");
const AppError = require("../utils/AppError");

const registerSchema = z.object({
  name: z.string().trim().min(1).max(120),
  email: z.string().trim().email().transform((email) => email.toLowerCase()),
  password: z.string().min(8).regex(/\d/, "Password must contain at least one number"),
}).strict();

const loginSchema = z.object({
  email: z.string().trim().email().transform((email) => email.toLowerCase()),
  password: z.string().min(1),
}).strict();

function parse(schema, input) {
  const result = schema.safeParse(input);
  if (!result.success) {
    const details = {};
    for (const issue of result.error.issues) {
      const field = issue.path.join(".") || "body";
      details[field] = issue.message;
    }
    throw new AppError(400, "VALIDATION_ERROR", "Request validation failed", details);
  }
  return result.data;
}

module.exports = { registerSchema, loginSchema, parse };
