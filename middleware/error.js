// Not found error handler
exports.notFound = (req, res, next) => {
  const error = new Error(`Not Found - ${req.originalUrl}`);
  res.status(404);
  next(error);
};

// General error handler
exports.errorHandler = (err, req, res, next) => {
  const statusCode = res.statusCode === 200 ? 500 : res.statusCode;

  res.status(statusCode).json({
    message: err.message,
    stack: process.env.NODE_ENV === "production" ? null : err.stack,
  });
};

// MongoDB duplicate key error handler
exports.handleDuplicateKeyError = (err, req, res, next) => {
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    return res.status(400).json({
      msg: `Duplicate value for ${field}. Please use another value.`,
    });
  }
  next(err);
};

// MongoDB validation error handler
exports.handleValidationError = (err, req, res, next) => {
  if (err.name === "ValidationError") {
    const errors = Object.values(err.errors).map((error) => error.message);
    return res.status(400).json({
      msg: "Validation Error",
      errors,
    });
  }
  next(err);
};

// JWT error handler
exports.handleJWTError = (err, req, res, next) => {
  if (err.name === "JsonWebTokenError") {
    return res.status(401).json({
      msg: "Invalid token. Please log in again.",
    });
  }
  if (err.name === "TokenExpiredError") {
    return res.status(401).json({
      msg: "Token expired. Please log in again.",
    });
  }
  next(err);
};
