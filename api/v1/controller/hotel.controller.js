const Hotel = require("../../../models/hotelDetail.model");
const Room = require("../../../models/room.model");
const HaversineDistance = require("../../../helper/HaversineDistance");

// [GET] /api/v1/hotel/search
module.exports.search = async (req, res) => {
  try {
    const {
      city,
      country,
      lat,
      lng,
      startDate,
      endDate,
      adults,
      children,
      rooms,
      roomTags,
    } = req.query;

    // Check if country is provided
    if (!country) {
      return res.json({
        status: 404,
        message: "Country is required.",
        data: null,
      });
    }

    const searchQuery = {};
    if (city !== undefined && city !== "undefined") {
      searchQuery["Address.City"] = city;
    }
    if (country !== undefined && country !== "undefined") {
      searchQuery["Address.Country"] = country;
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
      NumberAvailable: { $gte: requiredRooms }, // Ensure enough rooms are available
    };

    // Add roomTags to filter if they exist
    if (roomTags) {
      const roomTagsArray = roomTags.split(",");
      roomFilter.RoomTags = { $in: roomTagsArray };
    }

    console.log(roomFilter);

    // const roomInfos = await Room.find(roomFilter);
    const roomInfos = await Room.find({
      HotelId: { $in: hotels.map((hotel) => hotel.HotelId) },
      NumberAvailable: { $gte: requiredRooms },
    });

    // Filter out hotels with no available rooms and get the lowest and highest price for each hotel
    const returnHotels = hotels
      .map((hotel) => {
        const hotelRooms = roomInfos.filter(
          (room) => room.HotelId === hotel.HotelId
        );
        const numberOfRooms = hotelRooms.length;
        console.log(numberOfRooms, requiredRooms);
        if (numberOfRooms >= requiredRooms) {
          // Get the lowest and highest prices from the hotel's rooms
          const prices = hotelRooms.map((room) => room.BaseRate);
          const lowestPrice = Math.min(...prices);
          const highestPrice = Math.max(...prices);

          const roomTags = hotelRooms.map((room) => room.RoomTags).flat();

          if (roomTags.length === 0) {
            return res.json({
              status: 404,
              message:
                "No hotels found with available rooms for the specified services.",
              data: null,
            });
          }
          console.log();
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
      return res.json({
        status: 404,
        message:
          "No hotels found with available rooms for the specified location.",
        data: null,
      });
    }

    return res.json({
      status: 200,
      message: "Hotels found.",
      data: returnHotels,
    });
  } catch (error) {
    console.error("Error during hotel search:", error);
    return res.json({
      status: 500,
      message: "An error occurred while searching for hotels.",
      data: null,
    });
  }
};

// [GET] /api/v1/hotel/:hotelId
module.exports.getHotelById = async (req, res) => {
  console.log("getHotelById");
  try {
    const { hotelId } = req.params;
    const { startDate, endDate, adults, children, rooms } = req.query;

    const hotel = await Hotel.findOne({ HotelId: hotelId });
    if (!hotel) {
      return res.json({
        status: 404,
        message: "Hotel not found.",
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
    let requiredRooms = Math.ceil(totalGuests / maxGuestsPerRoom);
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

    return res.json({
      status: 200,
      message: "Hotel found.",
      data: returnHotel,
    });
  } catch (error) {
    console.error("Error during hotel search:", error);
    return res.json({
      status: 500,
      message: "An error occurred while searching for hotels.",
      data: null,
    });
  }
};

//[GET] /api/v1/hotel/:roomId
module.exports.getHotelRooms = async (req, res) => {
  console.log("getHotelRooms");
  try {
    const { roomId } = req.params;
    const room = await Room.findOne({ RoomId: roomId });
    if (!room) {
      return res.json({
        status: 404,
        message: "room not found.",
      });
    }
    return res.json({
      status: 200,
      message: "room found.",
      data: room,
    });
  } catch (error) {
    console.error("Error during room search:", error);
    return res.json({
      status: 500,
      message: "An error occurred while searching for room.",
      data: null,
    });
  }
};
