const AppError = require("./AppError");

async function requireOwnedRecord({
  model,
  idField,
  id,
  userId,
  select,
  include,
}) {
  const record = await model.findUnique({
    where: { [idField]: id },
    ...(select ? { select } : {}),
    ...(include ? { include } : {}),
  });

  if (!record) {
    throw new AppError(404, "NOT_FOUND", "Resource not found");
  }

  if (record.userId !== userId) {
    throw new AppError(403, "FORBIDDEN", "You do not have access to this resource");
  }

  return record;
}

module.exports = { requireOwnedRecord };
