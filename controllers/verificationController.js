const User = require("../models/User")
const asyncHandler = require("../utils/asyncHandler")
const ResponseHandler = require("../utils/response")
const logger = require("../utils/logger")
const emailService = require("../services/emailService")

const verifyEmail = asyncHandler(async (req, res) => {
  const { code } = req.params

  logger.logAuth("email verification attempt", null, null, req.ip, req.get("User-Agent"))

  try {
    const user = await User.findOne({
      verificationCode: code,
      verificationCodeExpires: { $gt: Date.now() },
    })

    if (!user) {
      logger.logAuth("email verification failed - invalid code", null, null, req.ip, req.get("User-Agent"))
      return ResponseHandler.error(res, "Invalid or expired verification code", 400)
    }

    if (user.isVerified) {
      logger.logAuth("email verification already verified", user._id, user.email, req.ip, req.get("User-Agent"))
      return ResponseHandler.success(res, null, "Email is already verified")
    }

    await user.verifyAccount()

    logger.logAuth("email verification success", user._id, user.email, req.ip, req.get("User-Agent"))

    try {
      await emailService.sendWelcomeEmail(user.email, user.name)
      logger.info("Welcome email sent after verification", {
        userId: user._id,
        email: user.email,
      })
    } catch (emailError) {
      logger.error("Failed to send welcome email after verification", {
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
      verifiedAt: new Date().toISOString(),
    }

    return ResponseHandler.success(res, userData, "Email verified successfully! Your account is now active.")
  } catch (error) {
    logger.error("Email verification process failed", {
      verificationCode: code,
      error: error.message,
      stack: error.stack,
    })

    return ResponseHandler.error(res, "Email verification failed. Please try again.")
  }
})

const checkVerificationStatus = asyncHandler(async (req, res) => {
  const { email } = req.params

  if (!email) {
    return ResponseHandler.validationError(res, [{ field: "email", message: "Email is required" }])
  }

  try {
    const user = await User.findOne({ email: email.toLowerCase().trim() })

    if (!user) {
      return ResponseHandler.notFound(res, "User not found")
    }

    const verificationStatus = {
      email: user.email,
      isVerified: user.isVerified,
      hasVerificationCode: !!user.verificationCode,
      verificationCodeExpired: user.verificationCodeExpires ? user.verificationCodeExpires < Date.now() : true,
    }

    return ResponseHandler.success(res, verificationStatus, "Verification status retrieved")
  } catch (error) {
    logger.error("Failed to check verification status", {
      email,
      error: error.message,
    })

    return ResponseHandler.error(res, "Failed to check verification status")
  }
})

const verifyEmailWithCode = asyncHandler(async (req, res) => {
  const { email, code } = req.body

  if (!email || !code) {
    return ResponseHandler.validationError(res, [
      { field: "email", message: "Email is required" },
      { field: "code", message: "Verification code is required" },
    ])
  }

  logger.logAuth("email verification with code attempt", null, email, req.ip, req.get("User-Agent"))

  try {
    const user = await User.findOne({
      email: email.toLowerCase().trim(),
      verificationCode: code,
      verificationCodeExpires: { $gt: Date.now() },
    })

    if (!user) {
      logger.logAuth("email verification with code failed", null, email, req.ip, req.get("User-Agent"))
      return ResponseHandler.error(res, "Invalid email or verification code", 400)
    }

    if (user.isVerified) {
      logger.logAuth("email verification with code already verified", user._id, email, req.ip, req.get("User-Agent"))
      return ResponseHandler.success(res, null, "Email is already verified")
    }

    await user.verifyAccount()

    logger.logAuth("email verification with code success", user._id, email, req.ip, req.get("User-Agent"))

    try {
      await emailService.sendWelcomeEmail(user.email, user.name)
    } catch (emailError) {
      logger.error("Failed to send welcome email", {
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
      verifiedAt: new Date().toISOString(),
    }

    return ResponseHandler.success(res, userData, "Email verified successfully! Your account is now active.")
  } catch (error) {
    logger.error("Email verification with code failed", {
      email,
      error: error.message,
    })

    return ResponseHandler.error(res, "Email verification failed. Please try again.")
  }
})

module.exports = {
  verifyEmail,
  checkVerificationStatus,
  verifyEmailWithCode,
}