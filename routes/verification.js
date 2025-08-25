const express = require("express")
const { validateVerificationCode } = require("../utils/validators")
const { verifyEmail, checkVerificationStatus, verifyEmailWithCode } = require("../controllers/verificationController")
const router = express.Router()

router.get("/verify/:code", validateVerificationCode, verifyEmail)
router.get("/status/:email", checkVerificationStatus)
router.post("/verify-code", verifyEmailWithCode)

module.exports = router
