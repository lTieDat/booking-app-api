const uploadToCloudinary = require('../../../helper/uploadToCloudinary')
module.exports.upload = async (req, res, next) => {
  if (req.file) {
    const link = await uploadToCloudinary(req.file.buffer)
    req.body[req.file.fieldname] = link
  }
  next()
}

module.exports.uploadMultipleFiles = async (req, res, next) => {
  try {
    if (!req.files || !req.files.image) {
      return res.status(400).json({ message: 'Missing required files.' })
    }

    const { image, images } = req.files

    // Upload overview image
    const overviewImageBuffer = image.buffer
    const overviewImageUrl = await uploadToCloudinary(overviewImageBuffer, 'hotel/overview')

    // Upload room images
    // const roomImageUrls = await Promise.all(images.map((file) => uploadToCloudinary(file.buffer, 'hotel/rooms')))

    // Update req.body with URLs
    req.body.image = overviewImageUrl
    // req.body.images = roomImageUrls

    // next()
  } catch (error) {
    console.error('Error uploading images:', error)
    return res.status(500).json({ message: 'Error uploading images.' })
  }
}
