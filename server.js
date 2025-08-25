const express = require("express")
const cors = require("cors")
const helmet = require("helmet")
const rateLimit = require("express-rate-limit")
require("dotenv").config()
const connectDB = require("./config/database")
const authRoutes = require("./routes/auth")
const verificationRoutes = require("./routes/verification")
const app = express()

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: "Too many requests from this IP, please try again later.",
})
app.use(limiter)
app.use(express.json({ limit: "10mb" }))
app.use(express.urlencoded({ extended: true, limit: "10mb" }))
connectDB()
app.use("/api/auth", authRoutes)
app.use("/api/verification", verificationRoutes)
app.get("/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Server is running properly",
    timestamp: new Date().toISOString(),
  })
})
app.use("*", (req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
  })
})
const PORT = process.env.PORT || 5000
app.listen(PORT, () => {
  console.log(`Server running ${PORT}`)
})
module.exports = app
