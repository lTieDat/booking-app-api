const Hotel = require("../../../models/hotelDetail.model");
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
    } = req.query;

    // Check if country is provided
    if (!country) {
      return res.json({
        status: 404,
        message: "Country are required.",
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

    if (hotels.length === 0) {
      return res.json({
        status: 404,
        message: "No hotels found for the specified location.",
        data: null,
      });
    }

    return res.json({
      status: 200,
      message: "Hotels found.",
      data: hotels,
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

//[GET] /api/v1/hotel/locations
module.exports.getLocations = async (req, res) => {
  const query = req.query.q || "";

  // Create a regex pattern for the query
  const regex = new RegExp(query, "i"); // 'i' flag for case-insensitive matching

  // Filter locations based on the regex pattern
  const filteredLocations = locations.filter((location) =>
    regex.test(location.name)
  );

  res.json(filteredLocations);
};
