const jwt = require("jsonwebtoken")
const User = require("../models/User")

const protect = async (req, res, next) => {
  let token

  try {
    if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
      token = req.headers.authorization.split(" ")[1]
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Access denied. No token provided.",
      })
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET)

    const user = await User.findById(decoded.id)

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Token is valid but user no longer exists",
      })
    }

    if (!user.isVerified) {
      return res.status(401).json({
        success: false,
        message: "Please verify your email address to access this resource",
      })
    }

    if (user.isLocked) {
      return res.status(423).json({
        success: false,
        message: "Account is temporarily locked due to too many failed login attempts",
      })
    }

    req.user = user
    next()
  } catch (error) {
    console.error("Auth middleware error:", error)

    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({
        success: false,
        message: "Invalid token",
      })
    }

    if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        success: false,
        message: "Token has expired",
      })
    }

    return res.status(500).json({
      success: false,
      message: "Server error during authentication",
    })
  }
}

const requireVerification = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      })
    }

    if (!req.user.isVerified) {
      return res.status(403).json({
        success: false,
        message: "Email verification required to access this resource",
      })
    }

    next()
  } catch (error) {
    console.error("Verification middleware error:", error)
    return res.status(500).json({
      success: false,
      message: "Server error during verification check",
    })
  }
}

const requireAdmin = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      })
    }

    if (req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Admin access required",
      })
    }

    next()
  } catch (error) {
    console.error("Admin middleware error:", error)
    return res.status(500).json({
      success: false,
      message: "Server error during admin check",
    })
  }
}

const optionalAuth = async (req, res, next) => {
  let token

  try {
    if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
      token = req.headers.authorization.split(" ")[1]
    }

    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET)

      const user = await User.findById(decoded.id)

      if (user && user.isVerified && !user.isLocked) {
        req.user = user
      }
    }

    next()
  } catch (error) {
    console.log("Optional auth failed:", error.message)
    next()
  }
}

module.exports = {
  protect,
  requireVerification,
  requireAdmin,
  optionalAuth,
}
