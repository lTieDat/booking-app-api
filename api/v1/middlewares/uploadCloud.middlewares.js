const uploadToCloudinary = require('../../../helper/uploadToCloudinary');

module.exports.upload = async (req, res, next) => {
  try {
    if (req.file) {
      const link = await uploadToCloudinary(req.file.buffer, 'hotel_images');
      req.body[req.file.fieldname] = link; // Sets req.body.image
      console.log('Cloudinary URL:', link); // Debug log
    } else {
      console.warn('No file provided in upload middleware');
    }
    next();
  } catch (error) {
    console.error('Error uploading file to Cloudinary:', error);
    return res.status(500).json({ message: 'Error uploading file.' });
  }
};

module.exports.uploadMultipleFiles = async (req, res, next) => {
  try {
    if (!req.files || (!req.files.image && !req.files.images)) {
      return res.status(400).json({ message: 'At least one image file is required.' });
    }

    const { image, images } = req.files;

    // Upload overview image (if provided)
    let overviewImageUrl = null;
    if (image && image[0]) {
      const overviewImageBuffer = image[0].buffer;
      overviewImageUrl = await uploadToCloudinary(overviewImageBuffer, 'hotel-overview');
    }

    // Upload room images (if provided)
    let roomImageUrls = [];
    if (images && Array.isArray(images)) {
      roomImageUrls = await Promise.all(
        images.map((file) => uploadToCloudinary(file.buffer, 'hotel/rooms'))
      );
    }

    // Update req.body with URLs
    if (overviewImageUrl) {
      req.body.image = overviewImageUrl;
    }
    if (roomImageUrls.length > 0) {
      req.body.images = roomImageUrls;
    }

    console.log('Updated Req Body:', req.body);

    next();
  } catch (error) {
    console.error('Error uploading images:', error);
    return res.status(500).json({ message: 'Error uploading images.' });
  }
};