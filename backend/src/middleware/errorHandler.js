const AppError = require("../utils/AppError");

function errorHandler(error, req, res, next) {
  if (res.headersSent) {
    return next(error);
  }

  const isMalformedJson = error instanceof SyntaxError && error.status === 400
    && error.type === "entity.parse.failed";
  const statusCode = isMalformedJson ? 400 : error instanceof AppError ? error.statusCode : 500;
  const code = isMalformedJson ? "VALIDATION_ERROR" : error instanceof AppError ? error.code : "INTERNAL_ERROR";
  const message = isMalformedJson
    ? "Request body contains invalid JSON"
    : error instanceof AppError
      ? error.message
      : "An unexpected error occurred";

  const response = {
    error: { code, message },
  };

  if (error instanceof AppError && error.details !== undefined) {
    response.error.details = error.details;
  }

  if (statusCode >= 500) {
    console.error(error);
  }

  return res.status(statusCode).json(response);
}

module.exports = errorHandler;
