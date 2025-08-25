const { body, param, validationResult } = require("express-validator")

const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map((error) => ({
      field: error.path,
      message: error.msg,
      value: error.value,
    }))

    return res.status(400).json({
      success: false,
      message: "Validation failed",
      errors: errorMessages,
    })
  }
  next()
}
const validateRegistration = [
  body("name")
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage("Name must be between 2 and 50 characters")
    .matches(/^[a-zA-Z\s]+$/)
    .withMessage("Name can only contain letters and spaces"),

  body("email")
    .isEmail()
    .withMessage("Please provide a valid email address")
    .normalizeEmail()
    .isLength({ max: 100 })
    .withMessage("Email cannot exceed 100 characters"),

  body("password")
    .isLength({ min: 6, max: 128 })
    .withMessage("Password must be between 6 and 128 characters")
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage("Password must contain at least one lowercase letter, one uppercase letter, and one number"),

  handleValidationErrors,
]

const validateLogin = [
  body("email").isEmail().withMessage("Please provide a valid email address").normalizeEmail(),

  body("password")
    .notEmpty()
    .withMessage("Password is required")
    .isLength({ min: 1 })
    .withMessage("Password cannot be empty"),

  handleValidationErrors,
]

const validateVerificationCode = [
  param("code")
    .isLength({ min: 6, max: 6 })
    .withMessage("Verification code must be exactly 6 characters")
    .isNumeric()
    .withMessage("Verification code must contain only numbers"),

  handleValidationErrors,
]
const validatePasswordResetRequest = [
  body("email").isEmail().withMessage("Please provide a valid email address").normalizeEmail(),

  handleValidationErrors,
]
const validatePasswordReset = [
  body("token")
    .notEmpty()
    .withMessage("Reset token is required")
    .isLength({ min: 1 })
    .withMessage("Reset token cannot be empty"),

  body("password")
    .isLength({ min: 6, max: 128 })
    .withMessage("Password must be between 6 and 128 characters")
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage("Password must contain at least one lowercase letter, one uppercase letter, and one number"),

  handleValidationErrors,
]

const validatePasswordChange = [
  body("currentPassword").notEmpty().withMessage("Current password is required"),

  body("newPassword")
    .isLength({ min: 6, max: 128 })
    .withMessage("New password must be between 6 and 128 characters")
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage("New password must contain at least one lowercase letter, one uppercase letter, and one number"),

  handleValidationErrors,
]
const validateProfileImage = (req, res, next) => {
  if (!req.file) {
    return res.status(400).json({
      success: false,
      message: "Profile image is required",
    })
  }
  const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/gif"]
  if (!allowedTypes.includes(req.file.mimetype)) {
    return res.status(400).json({
      success: false,
      message: "Only JPEG, PNG, and GIF images are allowed",
    })
  }
  if (req.file.size > 5 * 1024 * 1024) {
    return res.status(400).json({
      success: false,
      message: "File size cannot exceed 5MB",
    })
  }
  next()
}

module.exports = {
  validateRegistration,
  validateLogin,
  validateVerificationCode,
  validatePasswordResetRequest,
  validatePasswordReset,
  validatePasswordChange,
  validateProfileImage,
  handleValidationErrors,
}
