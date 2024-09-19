const mongoose = require("mongoose");

const addressSchema = new mongoose.Schema({
  StreetAddress: String,
  City: String,
  StateProvince: {
    type: String,
    index: true, // Create an index for StateProvince
  },
  PostalCode: String,
  Country: {
    type: String,
    index: true, // Create an index for Country
  },
});

const locationSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ["Point"],
    required: true,
  },
  coordinates: {
    type: [Number], // [longitude, latitude]
    required: true,
  },
});

const hotelSchema = new mongoose.Schema(
  {
    HotelId: String,
    HotelName: String,
    Description: String,
    Category: String,
    Tags: [String],
    ParkingIncluded: Boolean,
    LastRenovationDate: Date,
    Rating: Number,
    Address: addressSchema,
    Location: locationSchema,
  },
  {
    timestamps: true,
  }
);

const Hotel = mongoose.model("Hotel", hotelSchema, "hotels");

module.exports = Hotel;
