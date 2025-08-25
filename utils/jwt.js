const jwt = require("jsonwebtoken")

class JWTManager {
  constructor() {
    this.secret = process.env.JWT_SECRET
    this.expiresIn = process.env.JWT_EXPIRE || "7d"

    if (!this.secret) {
      throw new Error("JWT_SECRET environment variable is required")
    }
  }

  generateToken(payload) {
    try {
      return jwt.sign(payload, this.secret, {
        expiresIn: this.expiresIn,
        issuer: "user-onboarding-api",
        audience: "user-onboarding-client",
      })
    } catch (error) {
      console.error("Error generating JWT token:", error)
      throw new Error("Failed to generate authentication token")
    }
  }

  generateUserToken(user) {
    const payload = {
      id: user._id,
      email: user.email,
      isVerified: user.isVerified,
    }

    return this.generateToken(payload)
  }

  verifyToken(token) {
    try {
      return jwt.verify(token, this.secret, {
        issuer: "user-onboarding-api",
        audience: "user-onboarding-client",
      })
    } catch (error) {
      if (error.name === "TokenExpiredError") {
        throw new Error("Token has expired")
      } else if (error.name === "JsonWebTokenError") {
        throw new Error("Invalid token")
      } else {
        throw new Error("Token verification failed")
      }
    }
  }

  decodeToken(token) {
    try {
      return jwt.decode(token, { complete: true })
    } catch (error) {
      console.error("Error decoding JWT token:", error)
      return null
    }
  }

  generateRefreshToken(payload) {
    try {
      return jwt.sign(payload, this.secret, {
        expiresIn: "30d",
        issuer: "user-onboarding-api",
        audience: "user-onboarding-client",
      })
    } catch (error) {
      console.error("Error generating refresh token:", error)
      throw new Error("Failed to generate refresh token")
    }
  }
  extractTokenFromHeader(authHeader) {
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return null
    }
    return authHeader.split(" ")[1]
  }
  getTokenExpiry(token) {
    try {
      const decoded = this.decodeToken(token)
      if (decoded && decoded.payload && decoded.payload.exp) {
        return new Date(decoded.payload.exp * 1000)
      }
      return null
    } catch (error) {
      console.error("Error getting token expiry:", error)
      return null
    }
  }

  isTokenExpired(token) {
    try {
      const expiry = this.getTokenExpiry(token)
      if (!expiry) return true

      return expiry < new Date()
    } catch (error) {
      console.error("Error checking token expiry:", error)
      return true
    }
  }
}

const jwtManager = new JWTManager()

module.exports = jwtManager
