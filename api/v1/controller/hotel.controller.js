const Hotel = require('../../../models/hotelDetail.model');
const Room = require('../../../models/room.model');
const Review = require('../../../models/review.model');
const Booking = require('../../../models/booking.model');

// [GET] /api/v1/hotel/search
module.exports.search = async (req, res) => {
  try {
    const { city, country, lat, lng, startDate, endDate, adults, children, rooms, roomTags } = req.query;

    // Check if country is provided
    if (!country) {
      return res.status(400).json({
        message: 'Country is required.',
        data: null,
      });
    }

    const searchQuery = {};
    if (city && city !== 'undefined') {
      searchQuery['Address.City'] = city;
    }
    if (country && country !== 'undefined') {
      searchQuery['Address.Country'] = country;
    }

    const hotels = await Hotel.find(searchQuery);

    // Convert adults and children into numbers
    const adultsCount = parseInt(adults, 10) || 0;
    const childrenCount = parseInt(children, 10) || 0;
    const totalGuests = adultsCount + childrenCount;

    // Convert rooms into a number or default to 1
    const roomsCount = parseInt(rooms, 10) || 1;

    // Calculate required rooms if total guests exceed the maximum capacity per room (4)
    const maxGuestsPerRoom = 4;
    let requiredRooms = Math.ceil(totalGuests / maxGuestsPerRoom);

    // Ensure that requiredRooms does not exceed roomsCount requested by the user
    requiredRooms = Math.max(requiredRooms, roomsCount);

    // Room filtering
    const roomFilter = {
      HotelId: { $in: hotels.map((hotel) => hotel.HotelId) },
      NumberAvailable: { $gte: requiredRooms },
    };

    // Add roomTags to filter if they exist
    if (roomTags) {
      const roomTagsArray = roomTags.split(',');
      roomFilter.RoomTags = { $in: roomTagsArray };
    }

    const roomInfos = await Room.find(roomFilter);

    // Filter out hotels with no available rooms and get the lowest and highest price for each hotel
    const returnHotels = hotels
      .map((hotel) => {
        const hotelRooms = roomInfos.filter((room) => room.HotelId === hotel.HotelId);
        const numberOfRooms = hotelRooms.length;
        if (numberOfRooms >= requiredRooms) {
          // Get the lowest and highest prices from the hotel's rooms
          const prices = hotelRooms.map((room) => room.BaseRate);
          const lowestPrice = Math.min(...prices);
          const highestPrice = Math.max(...prices);

          const roomTags = hotelRooms.map((room) => room.RoomTags).flat();

          if (roomTags.length === 0) {
            return null; // Skip hotels with no matching room tags
          }
          return {
            ...hotel.toObject(),
            NumberOfRooms: numberOfRooms,
            LowestPrice: lowestPrice,
            HighestPrice: highestPrice,
            RoomTags: [...new Set(roomTags)],
          };
        }
        return null;
      })
      .filter((hotel) => hotel !== null);

    if (returnHotels.length === 0) {
      return res.status(404).json({
        message: 'No hotels found with available rooms for the specified criteria.',
        data: null,
      });
    }

    return res.status(200).json({
      message: 'Hotels found.',
      data: returnHotels,
    });
  } catch (error) {
    console.error('Error during hotel search:', error);
    return res.status(500).json({
      message: 'Internal server error.',
      data: null,
    });
  }
};

// [GET] /api/v1/hotel/:hotelId
module.exports.getHotelById = async (req, res) => {
  try {
    const { hotelId } = req.params;
    const { startDate, endDate, adults, children, rooms } = req.query;

    const hotel = await Hotel.findOne({ HotelId: hotelId });
    if (!hotel) {
      return res.status(404).json({
        message: 'Hotel not found.',
        data: null,
      });
    }

    const roomOfhotel = await Room.find({ HotelId: hotelId });
    const images = roomOfhotel.map((room) => room.Images.url);
    const roomTags = roomOfhotel.map((room) => room.RoomTags).flat();

    const adultsCount = parseInt(adults, 10) || 0;
    const childrenCount = parseInt(children, 10) || 0;
    const totalGuests = adultsCount + childrenCount;
    const roomsCount = parseInt(rooms, 10) || 1;

    const maxGuestsPerRoom = 4;
    let requiredRooms = Math.ceil(totalGuests / maxGuestsPerRoom) || 0;
    requiredRooms = Math.max(requiredRooms, roomsCount);

    const roomFilter = {
      HotelId: hotelId,
      NumberAvailable: { $gte: requiredRooms },
    };
    const roomInfos = await Room.find(roomFilter);

    const returnHotel = {
      ...hotel.toObject(),
      Rooms: roomInfos,
      Images: images,
      RoomTags: [...new Set(roomTags)],
    };

    return res.status(200).json({
      message: 'Hotel found.',
      data: returnHotel,
    });
  } catch (error) {
    console.error('Error fetching hotel:', error);
    return res.status(500).json({
      message: 'Internal server error.',
      data: null,
    });
  }
};

// [GET] /api/v1/hotel/:roomId
module.exports.getHotelRooms = async (req, res) => {
  try {
    const { roomId } = req.params;
    const room = await Room.findOne({ RoomId: roomId });
    if (!room) {
      return res.status(404).json({
        message: 'Room not found.',
        data: null,
      });
    }
    return res.status(200).json({
      message: 'Room found.',
      data: room,
    });
  } catch (error) {
    console.error('Error fetching room:', error);
    return res.status(500).json({
      message: 'Internal server error.',
      data: null,
    });
  }
};

// [POST] /api/v1/hotel/:hotelId/review/:userId
module.exports.addReview = async (req, res) => {
  try {
    const { hotelId, userId } = req.params;
    const { reviewText, rating, bookingId } = req.body;

    // Fetch the existing review and hotel in parallel
    const [existingReview, hotel] = await Promise.all([
      Review.findOne({ hotelId, userId, bookingId }),
      Hotel.findOne({ HotelId: hotelId }),
    ]);

    // If the hotel is not found, return an error response
    if (!hotel) {
      return res.status(404).json({
        message: 'Hotel not found.',
        data: null,
      });
    }

    let responseMessage;
    let savedReview;

    if (existingReview) {
      // Update existing review
      existingReview.reviewText = reviewText;
      existingReview.rating = rating;
      savedReview = await existingReview.save();
      responseMessage = 'Review updated successfully.';
    } else {
      // Create a new review
      const newReview = new Review({
        hotelId,
        userId,
        reviewText,
        rating,
        bookingId,
      });
      savedReview = await newReview.save();
      responseMessage = 'Review added successfully.';
    }

    // Calculate and update the hotel rating
    const reviews = await Review.find({ hotelId });
    const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length;

    hotel.rating = totalRating;
    await hotel.save();

    return res.status(200).json({
      message: responseMessage,
      data: savedReview,
    });
  } catch (error) {
    console.error('Error adding or updating review:', error);
    return res.status(500).json({
      message: 'Internal server error.',
      data: null,
    });
  }
};

// [GET] /api/v1/hotel/:hotelId/reviews
module.exports.getReviews = async (req, res) => {
  try {
    const { hotelId } = req.params;
    const reviews = await Review.find({ hotelId });
    return res.status(200).json({
      message: 'Reviews found.',
      data: reviews,
    });
  } catch (error) {
    console.error('Error fetching reviews:', error);
    return res.status(500).json({
      message: 'Internal server error.',
      data: null,
    });
  }
};

// [GET] /api/v1/hotel/:hotelId/statistics
module.exports.getHotelStatistics = async (req, res) => {
  try {
    const { hotelId } = req.params;

    // Fetch hotel, rooms, reviews, and bookings in parallel
    const [hotel, rooms, reviews, bookings] = await Promise.all([
      Hotel.findOne({ HotelId: hotelId }),
      Room.find({ HotelId: hotelId }),
      Review.find({ hotelId }),
      Booking.find({ hotelId }),
    ]);

    // If the hotel is not found, return an error response
    if (!hotel) {
      return res.status(404).json({
        message: 'Hotel not found.',
        data: null,
      });
    }

    // Calculate total rooms, reviews, ratings, and bookings
    const totalRooms = rooms.reduce((sum, room) => sum + room.MaxQuantity, 0);
    const totalReviews = reviews.length;
    const totalRating = hotel.Rating || 0;
    const totalBookings = bookings.length;

    // Calculate total revenue
    const totalRevenue = bookings.reduce((sum, booking) => sum + booking.totalAmount, 0);

    // Calculate total occupancy (number of adults + children)
    const totalOccupancy = bookings.reduce(
      (sum, booking) => sum + (booking.numberOfAdults + booking.numberOfChildren),
      0
    );

    // Calculate available and sold rooms
    const totalAvailableRooms = rooms.reduce((sum, room) => sum + room.NumberAvailable, 0);
    const totalRoomsSold = totalRooms - totalAvailableRooms;
    const totalRoomsSoldPercentage = totalRooms > 0 ? (totalRoomsSold / totalRooms) * 100 : 0;

    // Calculate average stay duration
    const averageStayDuration =
      bookings.reduce((sum, booking) => {
        const checkIn = new Date(booking.checkInDate);
        const checkOut = new Date(booking.checkOutDate);
        const duration = (checkOut - checkIn) / (1000 * 60 * 60 * 24);
        return sum + duration;
      }, 0) / (totalBookings || 1);

    // Calculate customer count by country
    const customerCountByCountry = bookings.reduce((counts, booking) => {
      counts[booking.customerCountry] = (counts[booking.customerCountry] || 0) + 1;
      return counts;
    }, {});

    // Calculate shuttle service usage statistics
    const shuttleServiceUsage = {
      airportShuttle: bookings.filter((booking) => booking.airportShuttle).length,
      rentalCar: bookings.filter((booking) => booking.rentalCar).length,
      taxiShuttle: bookings.filter((booking) => booking.taxiShuttle).length,
    };

    return res.status(200).json({
      message: 'Hotel statistics found.',
      data: {
        hotel: {
          HotelId: hotel.HotelId,
          Name: hotel.Name,
          Rating: hotel.Rating,
        },
        totalRooms,
        totalReviews,
        totalRating,
        totalBookings,
        totalRevenue,
        totalOccupancy,
        totalAvailableRooms,
        totalRoomsSold,
        totalRoomsSoldPercentage,
        averageStayDuration,
        customerCountByCountry,
        shuttleServiceUsage,
      },
    });
  } catch (error) {
    console.error('Error fetching hotel statistics:', error);
    return res.status(500).json({
      message: 'Internal server error.',
      data: null,
    });
  }
};

// [POST] /api/v1/hotel/updateInfo/:hotel
module.exports.updateHotelInfo = async (req, res) => {
  try {
    const hotelId = req.query.hotelID;
    const { hotelData, image } = req.body;

    // Parse the hotelData JSON string
    const parsedHotelData = JSON.parse(hotelData);

    // Find the hotel by HotelId
    const hotel = await Hotel.findOne({ HotelId: hotelId });
    if (!hotel) {
      return res.status(404).json({
        message: 'Hotel not found.',
        data: null,
      });
    }

    // Update the hotel fields
    hotel.HotelName = parsedHotelData.HotelName;
    hotel.Description = parsedHotelData.Description;
    hotel.Category = parsedHotelData.Category;
    hotel.Tags = parsedHotelData.Tags;
    hotel.ParkingIncluded = parsedHotelData.ParkingIncluded;
    hotel.LastRenovationDate = parsedHotelData.LastRenovationDate;
    hotel.Rating = parsedHotelData.Rating;
    hotel.Address = parsedHotelData.Address;

    // Handle image upload if a new image is provided
    if (image) {
      hotel.images.imgSource = image;
    }

    // Save the updated hotel
    await hotel.save();

    return res.status(200).json({
      message: 'Hotel information updated successfully.',
      data: hotel,
    });
  } catch (error) {
    console.error('Error updating hotel info:', error);
    return res.status(500).json({
      message: 'Internal server error.',
      data: null,
    });
  }
};

// [POST] /api/v1/hotel/updateRoom/:room
module.exports.updateRoomInfo = async (req, res) => {
  try {
    const { hotelId } = req.params;
    const { file } = req;

    const hotel = await Hotel.findOne({ HotelId: hotelId });
    if (!hotel) {
      return res.status(404).json({
        message: 'Hotel not found.',
        data: null,
      });
    }

    hotel.Images.push({ url: file.path });
    await hotel.save();

    return res.status(200).json({
      message: 'Image uploaded successfully.',
      data: hotel,
    });
  } catch (error) {
    console.error('Error uploading image:', error);
    return res.status(500).json({
      message: 'Internal server error.',
      data: null,
    });
  }
};

// [PUT] /api/v1/hotel/create
module.exports.createHotel = async (req, res) => {
  const generateRandomString = (length) => {
    let result = '';
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < length; i++) {
      result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return result;
  };

  try {
    const { propertyType, propertyDetails, rooms, image } = req.body;
    const parsedPropertyDetails = JSON.parse(propertyDetails);
    const parsedRoomDetails = JSON.parse(rooms);
    const { HotelName, Description, Tags, ParkingIncluded, LastRenovationDate, Address } =
      parsedPropertyDetails;

    const HotelTags = Tags.toString().includes(',') ? Tags.split(',') : [Tags];
    const ID = generateRandomString(20);

    const newHotel = new Hotel({
      HotelId: ID,
      HotelName,
      Description,
      Category: propertyType,
      Tags: HotelTags,
      images: {
        imgSource: image,
      },
      ParkingIncluded,
      LastRenovationDate: new Date(LastRenovationDate),
      Address,
      Location: {
        type: 'Point',
        coordinates: [Address?.Longitude || 0, Address?.Latitude || 0],
      },
    });

    const newRooms = parsedRoomDetails.map((room) => {
      const roomID = generateRandomString(20);
      return new Room({
        RoomId: roomID,
        HotelId: ID,
        RoomType: room.RoomType,
        Description: room.Description,
        BaseRate: room.BaseRate,
        Discount: room.Discount,
        BedOptions: room.BedOptions,
        MaxOccupancy: room.MaxOccupancy,
        RoomTags: room.RoomTags,
        NumberAvailable: room.MaxQuantity,
        MaxQuantity: room.MaxQuantity,
        Images: {
          url: image,
          description: room.Images.Description,
        },
      });
    });

    await Promise.all([Room.insertMany(newRooms), newHotel.save()]);

    return res.status(200).json({
      message: 'Hotel created successfully.',
      data: newHotel,
    });
  } catch (error) {
    console.error('Error creating hotel:', error);
    return res.status(500).json({
      message: 'Internal server error.',
      data: null,
    });
  }
};

// [DELETE] /api/v1/hotel/:hotelId/room/:roomId/delete
module.exports.deleteRoom = async (req, res) => {
  try {
    const { hotelId, roomId } = req.params;
    const room = await Room.findOne({ RoomId: roomId });
    if (!room) {
      return res.status(404).json({
        message: 'Room not found.',
      });
    }
    await Room.deleteOne({ RoomId: roomId });
    return res.status(200).json({
      message: 'Room deleted successfully.',
    });
  } catch (error) {
    console.error('Error deleting room:', error);
    return res.status(500).json({
      message: 'Internal server error.',
    });
  }
};

// [DELETE] /api/v1/hotel/:hotelId/delete
module.exports.deleteHotel = async (req, res) => {
  try {
    const { hotelId } = req.params;
    const hotel = await Hotel.findOne({ HotelId: hotelId });
    if (!hotel) {
      return res.status(404).json({
        message: 'Hotel not found.',
      });
    }

    await Promise.all([
      Hotel.deleteOne({ HotelId: hotelId }),
      Room.deleteMany({ HotelId: hotelId }),
      Review.deleteMany({ hotelId }),
      Booking.deleteMany({ hotelId }),
    ]);

    return res.status(200).json({
      message: 'Hotel deleted successfully.',
    });
  } catch (error) {
    console.error('Error deleting hotel:', error);
    return res.status(500).json({
      message: 'Internal server error.',
    });
  }
};