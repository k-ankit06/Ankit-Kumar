const fs = require("fs")
const path = require("path")

class Logger {
  constructor() {
    this.logDir = path.join(__dirname, "../logs")
    this.ensureLogDirectory()
  }

  ensureLogDirectory() {
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true })
    }
  }

  formatMessage(level, message, meta = {}) {
    return JSON.stringify({
      timestamp: new Date().toISOString(),
      level: level.toUpperCase(),
      message,
      ...meta,
    })
  }

  writeToFile(filename, message) {
    const filePath = path.join(this.logDir, filename)
    const logMessage = message + "\n"

    fs.appendFile(filePath, logMessage, (err) => {
      if (err) {
        console.error("Failed to write to log file:", err)
      }
    })
  }

  info(message, meta = {}) {
    const formattedMessage = this.formatMessage("info", message, meta)
    console.log(formattedMessage)

    if (process.env.NODE_ENV === "production") {
      this.writeToFile("app.log", formattedMessage)
    }
  }

  error(message, meta = {}) {
    const formattedMessage = this.formatMessage("error", message, meta)
    console.error(formattedMessage)

    if (process.env.NODE_ENV === "production") {
      this.writeToFile("error.log", formattedMessage)
    }
  }

  warn(message, meta = {}) {
    const formattedMessage = this.formatMessage("warn", message, meta)
    console.warn(formattedMessage)

    if (process.env.NODE_ENV === "production") {
      this.writeToFile("app.log", formattedMessage)
    }
  }

  debug(message, meta = {}) {
    if (process.env.NODE_ENV === "development") {
      const formattedMessage = this.formatMessage("debug", message, meta)
      console.log(formattedMessage)
    }
  }

  logAuth(event, userId, email, ip, userAgent) {
    this.info(`Auth Event: ${event}`, {
      userId,
      email,
      ip,
      userAgent,
      category: "authentication",
    })
  }

  logRequest(req) {
    this.info("API Request", {
      method: req.method,
      url: req.originalUrl,
      ip: req.ip,
      userAgent: req.get("User-Agent"),
      userId: req.user ? req.user._id : null,
      category: "api",
    })
  }
}

const logger = new Logger()

module.exports = logger
