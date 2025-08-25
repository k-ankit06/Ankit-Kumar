const User = require("../models/User")
const asyncHandler = require("../utils/asyncHandler")
const ResponseHandler = require("../utils/response")
const jwtManager = require("../utils/jwt")
const logger = require("../utils/logger")
const emailService = require("../services/emailService")
const crypto = require("crypto")

const registerUser = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body

  logger.logAuth("Registration", null, email, req.ip, req.get("User-Agent"))

  const existingUser = await User.findOne({ email })
  if (existingUser) {
    logger.logAuth("Registration failed", null, email, req.ip, req.get("User-Agent"))
    return ResponseHandler.conflict(res, "User with this email already exists")
  }

  let profileImageUrl = null
  if (req.file) {
    profileImageUrl = req.file.path
    logger.info("Profile image uploaded successfully", {
      email,
      imageUrl: profileImageUrl,
      fileSize: req.file.size,
    })
  }

  try {
    const user = new User({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password,
      profileImage: profileImageUrl,
    })

    const verificationCode = user.generateVerificationCode()

    await user.save()

    logger.logAuth("User created", user._id, email, req.ip, req.get("User-Agent"))

    try {
      await emailService.sendVerificationEmail(user.email, user.name, verificationCode)
      logger.info("Verification email sent successfully", {
        userId: user._id,
        email: user.email,
      })
    } catch (emailError) {
      logger.error("Failed to send verification email", {
        userId: user._id,
        email: user.email,
        error: emailError.message,
      })
    }

    const userData = {
      id: user._id,
      name: user.name,
      email: user.email,
      profileImage: user.profileImage,
      isVerified: user.isVerified,
      createdAt: user.createdAt,
    }

    logger.logAuth("Successful registration", user._id, email, req.ip, req.get("User-Agent"))

    return ResponseHandler.created(
      res,
      userData,
      "User registered successfully. Please check your email for verification instructions.",
    )
  } catch (error) {
    logger.error("Registration failed", {
      email,
      error: error.message,
      stack: error.stack,
    })

    if (error.code === 11000) {
      return ResponseHandler.conflict(res, "User with this email already exists")
    }

    if (error.name === "ValidationError") {
      const validationErrors = Object.values(error.errors).map((err) => ({
        field: err.path,
        message: err.message,
      }))
      return ResponseHandler.validationError(res, validationErrors)
    }

    return ResponseHandler.error(res, "Registration failed. Please try again.")
  }
})

const resendVerificationEmail = asyncHandler(async (req, res) => {
  const { email } = req.body

  if (!email) {
    return ResponseHandler.validationError(res, [{ field: "email", message: "Email is required" }])
  }

  const user = await User.findOne({ email: email.toLowerCase().trim() })

  if (!user) {
    return ResponseHandler.success(res, null, "If the email exists, a verification email has been sent.")
  }

  if (user.isVerified) {
    return ResponseHandler.error(res, "User is already verified", 400)
  }

  try {
    const verificationCode = user.generateVerificationCode()
    await user.save()

    await emailService.sendVerificationEmail(user.email, user.name, verificationCode)

    logger.logAuth("Email Sent", user._id, email, req.ip, req.get("User-Agent"))

    return ResponseHandler.success(res, null, "Verification email sent successfully.")
  } catch (error) {
    logger.error("Failed to resend verification email", {
      userId: user._id,
      email,
      error: error.message,
    })

    return ResponseHandler.error(res, "Failed to send verification email. Please try again.")
  }
})

const loginUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body

  logger.logAuth("Login attempt", null, email, req.ip, req.get("User-Agent"))

  const user = await User.findByEmail(email.toLowerCase().trim())

  if (!user) {
    logger.logAuth("Login failed - user not found", null, email, req.ip, req.get("User-Agent"))
    return ResponseHandler.unauthorized(res, "Invalid email or password")
  }

  if (user.isLocked) {
    logger.logAuth("Login failed - account locked", user._id, email, req.ip, req.get("User-Agent"))
    return ResponseHandler.error(
      res,
      "Account is temporarily locked due to too many failed login attempts. Please try again later.",
      423,
    )
  }

  if (!user.isVerified) {
    logger.logAuth("not verified", user._id, email, req.ip, req.get("User-Agent"))
    return ResponseHandler.forbidden(res, "Please verify your email address before logging in")
  }

  const isPasswordValid = await user.comparePassword(password)

  if (!isPasswordValid) {
    logger.logAuth("wrong password", user._id, email, req.ip, req.get("User-Agent"))

    await user.incLoginAttempts()

    return ResponseHandler.unauthorized(res, "Invalid email or password")
  }

  try {
    await user.resetLoginAttempts()

    const token = jwtManager.generateUserToken(user)

    const userData = {
      id: user._id,
      name: user.name,
      email: user.email,
      profileImage: user.profileImage,
      isVerified: user.isVerified,
      lastLogin: user.lastLogin,
      createdAt: user.createdAt,
    }

    logger.logAuth("Success", user._id, email, req.ip, req.get("User-Agent"))

    return ResponseHandler.success(
      res,
      {
        user: userData,
        token,
        tokenType: "Bearer",
      },
      "Login successful",
    )
  } catch (error) {
    logger.error("Login process failed", {
      userId: user._id,
      email,
      error: error.message,
    })

    return ResponseHandler.error(res, "Login failed. Please try again.")
  }
})

const getUserProfile = asyncHandler(async (req, res) => {
  const user = req.user

  const userData = {
    id: user._id,
    name: user.name,
    email: user.email,
    profileImage: user.profileImage,
    isVerified: user.isVerified,
    lastLogin: user.lastLogin,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  }

  return ResponseHandler.success(res, userData, "Profile retrieved successfully")
})

const updateUserProfile = asyncHandler(async (req, res) => {
  const { name } = req.body
  const user = req.user

  try {
    if (name && name.trim()) {
      user.name = name.trim()
    }

    if (req.file) {
      user.profileImage = req.file.path
      logger.info("Profile image updated", {
        userId: user._id,
        newImageUrl: user.profileImage,
      })
    }

    await user.save()

    const userData = {
      id: user._id,
      name: user.name,
      email: user.email,
      profileImage: user.profileImage,
      isVerified: user.isVerified,
      updatedAt: user.updatedAt,
    }

    logger.info("Profile updated successfully", {
      userId: user._id,
      email: user.email,
    })

    return ResponseHandler.success(res, userData, "Profile updated successfully")
  } catch (error) {
    logger.error("Profile update failed", {
      userId: user._id,
      error: error.message,
    })

    if (error.name === "ValidationError") {
      const validationErrors = Object.values(error.errors).map((err) => ({
        field: err.path,
        message: err.message,
      }))
      return ResponseHandler.validationError(res, validationErrors)
    }

    return ResponseHandler.error(res, "Profile update failed. Please try again.")
  }
})

const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body

  logger.logAuth("PASSWORD_RESET_REQUEST", null, email, req.ip, req.get("User-Agent"))

  try {
    const user = await User.findOne({ email: email.toLowerCase().trim() })

    if (!user) {
      return ResponseHandler.success(res, null, "If the email exists, a password reset link has been sent.")
    }

    const resetToken = crypto.randomBytes(32).toString("hex")

    user.resetPasswordToken = crypto.createHash("sha256").update(resetToken).digest("hex")
    user.resetPasswordExpires = Date.now() + 10 * 60 * 1000

    await user.save({ validateBeforeSave: false })

    await emailService.sendPasswordResetEmail(user.email, user.name, resetToken)

    logger.logAuth("PASSWORD_RESET_EMAIL_SENT", user._id, email, req.ip, req.get("User-Agent"))

    return ResponseHandler.success(res, null, "Password reset email sent successfully.")
  } catch (error) {
    logger.error("Password reset request failed", {
      email,
      error: error.message,
    })

    return ResponseHandler.error(res, "Failed to process password reset request.")
  }
})

const resetPassword = asyncHandler(async (req, res) => {
  const { token, password } = req.body

  logger.logAuth("PASSWORD_RESET_ATTEMPT", null, null, req.ip, req.get("User-Agent"))

  try {
    const resetPasswordToken = crypto.createHash("sha256").update(token).digest("hex")

    const user = await User.findOne({
      resetPasswordToken,
      resetPasswordExpires: { $gt: Date.now() },
    })

    if (!user) {
      logger.logAuth("PASSWORD_RESET_FAILED_INVALID_TOKEN", null, null, req.ip, req.get("User-Agent"))
      return ResponseHandler.error(res, "Invalid or expired reset token", 400)
    }

    user.password = password
    user.resetPasswordToken = undefined
    user.resetPasswordExpires = undefined

    await user.save()

    logger.logAuth("PASSWORD_RESET_SUCCESS", user._id, user.email, req.ip, req.get("User-Agent"))

    return ResponseHandler.success(res, null, "Password reset successful. You can now login with your new password.")
  } catch (error) {
    logger.error("Password reset failed", {
      error: error.message,
    })

    return ResponseHandler.error(res, "Password reset failed. Please try again.")
  }
})

const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body
  const user = await User.findById(req.user._id).select("+password")

  const isCurrentPasswordValid = await user.comparePassword(currentPassword)

  if (!isCurrentPasswordValid) {
    logger.logAuth("PASSWORD_CHANGE_FAILED_INVALID_CURRENT", user._id, user.email, req.ip, req.get("User-Agent"))
    return ResponseHandler.unauthorized(res, "Current password is incorrect")
  }

  user.password = newPassword
  await user.save()

  logger.logAuth("password changed", user._id, user.email, req.ip, req.get("User-Agent"))

  return ResponseHandler.success(res, null, "Password changed successfully")
})

const refreshToken = asyncHandler(async (req, res) => {
  const { refreshToken: token } = req.body

  if (!token) {
    return ResponseHandler.unauthorized(res, "Refresh token is required")
  }

  try {
    const decoded = jwtManager.verifyToken(token)

    const user = await User.findById(decoded.id)

    if (!user || !user.isVerified) {
      return ResponseHandler.unauthorized(res, "Invalid refresh token")
    }

    const newToken = jwtManager.generateUserToken(user)

    logger.logAuth("refreshed", user._id, user.email, req.ip, req.get("User-Agent"))

    return ResponseHandler.success(
      res,
      {
        token: newToken,
        tokenType: "Bearer",
      },
      "Token refreshed successfully",
    )
  } catch (error) {
    logger.error("Token refresh failed", {
      error: error.message,
    })

    return ResponseHandler.unauthorized(res, "Invalid or expired refresh token")
  }
})

const logoutUser = asyncHandler(async (req, res) => {
  logger.logAuth("Logout", req.user._id, req.user.email, req.ip, req.get("User-Agent"))

  return ResponseHandler.success(res, null, "Logged out successfully")
})

module.exports = {
  registerUser,
  resendVerificationEmail,
  loginUser,
  getUserProfile,
  updateUserProfile,
  forgotPassword,
  resetPassword,
  changePassword,
  refreshToken,
  logoutUser,
}
