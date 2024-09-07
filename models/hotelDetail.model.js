const mongoose = require("mongoose");

const imageSchema = new mongoose.Schema({
  caption: String,
  imgSource: String,
});

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
    Description_fr: String, // Added French description field
    Category: String,
    images: [imageSchema],
    Tags: [String],
    ParkingIncluded: Boolean,
    LastRenovationDate: Date,
    Rating: Number,
    Address: addressSchema,
    Location: locationSchema,
  },
  {
    timestamps: true, // Adds createdAt and updatedAt fields automatically
  }
);

const Hotel = mongoose.model("Hotel", hotelSchema, "hotels");

module.exports = Hotel;
