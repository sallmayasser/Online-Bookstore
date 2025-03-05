const jwt = require("jsonwebtoken");
const asyncHandler = require("express-async-handler");
const User = require("../Models/userModel");
const ApiError = require("../Utils/apiError");

// Extract token from request headers
const extractToken = (req) => {
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    return req.headers.authorization.split(" ")[1];
  }
  return null;
};

// Validate user existence and password change
const validateUser = async (decoded) => {
  const user = await User.findById(decoded.userId);
  if (!user) {
    throw new ApiError(
      "User associated with this token no longer exists.",
      401
    );
  }

  if (user.passwordChangedAt) {
    const passChangedTimestamp = Math.floor(
      user.passwordChangedAt.getTime() / 1000
    );
    if (passChangedTimestamp > decoded.iat) {
      throw new ApiError(
        "Your password has been changed recently. Please log in again.",
        401
      );
    }
  }

  return user;
};

// Protect middleware
exports.protect = asyncHandler(async (req, res, next) => {
  try {
    // 1) Extract and verify token
    const token = extractToken(req);
    if (!token) {
      throw new ApiError("Access denied. Please log in to continue.", 401);
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);

    // 2) Validate user and password change
    req.user = await validateUser(decoded);

    next();
  } catch (error) {
    next(error);
  }
});


exports.allowedTo = (...roles) =>
  asyncHandler(async (req, res, next) => {
    // 1) access roles
    // 2) access registered user (req.user.role)
    if (!roles.includes(req.user.role)) {
      return next(
        new ApiError("You are not allowed to access this route", 403)
      );
    }
    next();
  });