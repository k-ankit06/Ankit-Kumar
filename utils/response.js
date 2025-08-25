class ResponseHandler {
  static success(res, data = null, message = "Success", statusCode = 200) {
    const response = {
      success: true,
      message,
      timestamp: new Date().toISOString(),
    }

    if (data !== null) {
      response.data = data
    }

    return res.status(statusCode).json(response)
  }

  static error(res, message = "Internal Server Error", statusCode = 500, errors = null) {
    const response = {
      success: false,
      message,
      timestamp: new Date().toISOString(),
    }

    if (errors) {
      response.errors = errors
    }

    if (process.env.NODE_ENV === "development") {
      console.error(`API Error [${statusCode}]:`, message)
      if (errors) {
        console.error("Error details:", errors)
      }
    }

    return res.status(statusCode).json(response)
  }

  static validationError(res, errors, message = "Validation failed") {
    return this.error(res, message, 400, errors)
  }
  static unauthorized(res, message = "Unauthorized access") {
    return this.error(res, message, 401)
  }
  static forbidden(res, message = "Access forbidden") {
    return this.error(res, message, 403)
  }
  static notFound(res, message = "Resource not found") {
    return this.error(res, message, 404)
  }
  static conflict(res, message = "Resource conflict") {
    return this.error(res, message, 409)
  }

  static tooManyRequests(res, message = "Too many requests") {
    return this.error(res, message, 429)
  }
  static created(res, data = null, message = "Resource created successfully") {
    return this.success(res, data, message, 201)
  }
  static noContent(res, message = "No content") {
    return res.status(204).json({
      success: true,
      message,
      timestamp: new Date().toISOString(),
    })
  }
  static paginated(res, data, pagination, message = "Data retrieved successfully") {
    const response = {
      success: true,
      message,
      data,
      pagination: {
        page: pagination.page,
        limit: pagination.limit,
        total: pagination.total,
        pages: Math.ceil(pagination.total / pagination.limit),
        hasNext: pagination.page < Math.ceil(pagination.total / pagination.limit),
        hasPrev: pagination.page > 1,
      },
      timestamp: new Date().toISOString(),
    }

    return res.status(200).json(response)
  }
}

module.exports = ResponseHandler
