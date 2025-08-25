const { cloudinary } = require("../config/cloudinary")
const logger = require("../utils/logger")

class CloudinaryService {
  async uploadImage(file, options = {}) {
    try {
      const defaultOptions = {
        folder: "user-profiles",
        transformation: [{ width: 500, height: 500, crop: "fill", quality: "auto" }],
        resource_type: "image",
      }
      const uploadOptions = { ...defaultOptions, ...options }
      const result = await cloudinary.uploader.upload(file.path, uploadOptions)
      logger.info("Image uploaded to Cloudinary", {
        publicId: result.public_id,
        url: result.secure_url,
        size: result.bytes,
      })

      return {
        publicId: result.public_id,
        url: result.secure_url,
        width: result.width,
        height: result.height,
        format: result.format,
        size: result.bytes,
      }
    } catch (error) {
      logger.error("Cloudinary upload failed", {
        error: error.message,
        stack: error.stack,
      })
      throw new Error("Image upload failed")
    }
  }

  async deleteImage(publicId) {
    try {
      const result = await cloudinary.uploader.destroy(publicId)

      logger.info("Image deleted from Cloudinary", {
        publicId,
        result: result.result,
      })
      return result
    } catch (error) {
      logger.error("Cloudinary delete failed", {
        publicId,
        error: error.message,
      })
      throw new Error("Image deletion failed")
    }
  }
  async getImageDetails(publicId) {
    try {
      const result = await cloudinary.api.resource(publicId)
      return result
    } catch (error) {
      logger.error("Failed to get image details", {
        publicId,
        error: error.message,
      })
      throw new Error("Failed to get image details")
    }
  }
  generateOptimizedUrl(publicId, options = {}) {
    try {
      const defaultOptions = {
        quality: "auto",
        fetch_format: "auto",
      }
      const transformOptions = { ...defaultOptions, ...options }

      return cloudinary.url(publicId, transformOptions)
    } catch (error) {
      logger.error("Failed to generate optimized URL", {
        publicId,
        error: error.message,
      })
      return null
    }
  }

  generateThumbnail(publicId, width = 150, height = 150) {
    return this.generateOptimizedUrl(publicId, {
      width,
      height,
      crop: "fill",
      quality: "auto",
      fetch_format: "auto",
    })
  }
}

const cloudinaryService = new CloudinaryService()

module.exports = cloudinaryService
