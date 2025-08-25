const cloudinary = require("cloudinary").v2
const { CloudinaryStorage } = require("multer-storage-cloudinary")
const multer = require("multer")

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "user-profiles",
    allowed_formats: ["jpg", "jpeg", "png", "gif"],
    transformation: [{ width: 500, height: 500, crop: "fill", quality: "auto" }],
    public_id: (req, file) => {
      const timestamp = Date.now()
      const randomString = Math.random().toString(36).substring(2, 15)
      return `profile_${timestamp}_${randomString}`
    },
  },
})
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
  fileFilter: (req, file, cb) => {
  if (file.mimetype.startsWith("image/")) {
    cb(null, true);
  } else {
    cb(new Error("Sorry, only image files (jpg, jpeg, png, gif) are allowed!"), false);
  }
},
})

module.exports = { cloudinary, upload }
