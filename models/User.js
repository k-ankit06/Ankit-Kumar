const mongoose = require("mongoose")
const bcrypt = require("bcryptjs")

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
      minlength: [2, "Name must be at least 2 characters long"],
      maxlength: [50, "Name cannot exceed 50 characters"],
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, "Please enter a valid email address"],
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [6, "Password must be at least 6 characters long"],
      select: false,
    },
    profileImage: {
      type: String,
      default: null,
      validate: {
        validator: (v) => {
          if (v && v.length > 0) {
            return /^https?:\/\/.+\.(jpg|jpeg|png|gif)$/i.test(v)
          }
          return true
        },
        message: "Profile image must be a valid image URL",
      },
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    verificationCode: {
      type: String,
      required: true,
      unique: true,
    },
    verificationCodeExpires: {
      type: Date,
      default: Date.now,
      expires: 3600,
    },
    loginAttempts: {
      type: Number,
      default: 0,
    },
    lockUntil: {
      type: Date,
    },
    lastLogin: {
      type: Date,
    },
    resetPasswordToken: {
      type: String,
    },
    resetPasswordExpires: {
      type: Date,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (doc, ret) => {
        delete ret.password
        delete ret.verificationCode
        delete ret.verificationCodeExpires
        delete ret.loginAttempts
        delete ret.lockUntil
        delete ret.resetPasswordToken
        delete ret.resetPasswordExpires
        delete ret.__v
        return ret
      },
    },
  },
)

userSchema.index({ email: 1 })
userSchema.index({ verificationCode: 1 })
userSchema.index({ resetPasswordToken: 1 })

userSchema.virtual("isLocked").get(function () {
  return !!(this.lockUntil && this.lockUntil > Date.now())
})

userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next()

  try {
    const salt = await bcrypt.genSalt(12)
    this.password = await bcrypt.hash(this.password, salt)
    next()
  } catch (error) {
    next(error)
  }
})

userSchema.methods.comparePassword = async function (candidatePassword) {
  if (!this.password) return false
  return await bcrypt.compare(candidatePassword, this.password)
}

userSchema.methods.generateVerificationCode = function () {
  const code = Math.floor(100000 + Math.random() * 900000).toString()
  this.verificationCode = code
  this.verificationCodeExpires = Date.now() + 3600000
  return code
}
userSchema.methods.incLoginAttempts = function () {
  if (this.lockUntil && this.lockUntil < Date.now()) {
    return this.updateOne({
      $unset: { lockUntil: 1 },
      $set: { loginAttempts: 1 },
    })
  }
  const updates = { $inc: { loginAttempts: 1 } }

  if (this.loginAttempts + 1 >= 5 && !this.isLocked) {
    updates.$set = { lockUntil: Date.now() + 2 * 60 * 60 * 1000 }
  }

  return this.updateOne(updates)
}

userSchema.methods.resetLoginAttempts = function () {
  return this.updateOne({
    $unset: { loginAttempts: 1, lockUntil: 1 },
    $set: { lastLogin: Date.now() },
  })
}

userSchema.statics.findByEmail = function (email) {
  return this.findOne({ email }).select("+password")
}

userSchema.statics.findVerified = function (conditions = {}) {
  return this.find({ ...conditions, isVerified: true })
}

userSchema.methods.verifyAccount = function () {
  this.isVerified = true
  this.verificationCode = undefined
  this.verificationCodeExpires = undefined
  return this.save()
}

module.exports = mongoose.model("User", userSchema)
