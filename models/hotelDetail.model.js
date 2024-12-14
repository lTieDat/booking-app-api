const mongoose = require('mongoose')

const addressSchema = new mongoose.Schema({
  StreetAddress: { type: String, required: true },
  City: { type: String, required: true },
  StateProvince: {
    type: String,
    index: true, // Index for StateProvince
  },
  PostalCode: { type: String, required: true },
  Country: {
    type: String,
    index: true, // Index for Country
    required: true,
  },
})

const locationSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['Point'],
    required: true,
  },
  coordinates: {
    type: [Number],
    required: true,
  },
})

const hotelSchema = new mongoose.Schema(
  {
    HotelId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    HotelName: { type: String, required: true },
    Description: { type: String, required: true },
    Category: { type: String, default: 'Standard' },
    images: {
      caption: { type: String, default: 'overview' },
      imgSource: { type: String, required: true },
    },
    Tags: [{ type: String }],
    ParkingIncluded: { type: Boolean, default: false },
    LastRenovationDate: { type: Date },
    Rating: { type: Number, min: 0, max: 5, default: 3 },
    Address: { type: addressSchema, required: true },
    Location: { type: locationSchema, required: true },
  },
  {
    timestamps: true,
  }
)

const Hotel = mongoose.model('Hotel', hotelSchema, 'hotels')

module.exports = Hotel
