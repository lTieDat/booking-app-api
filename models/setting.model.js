const mongoose = require('mongoose')
const { Post } = require('./post.model')

const settingSchema = new mongoose.Schema(
  {
    suggestingPlace: {
      type: [String],
      default: [],
    },
    suggestingHotel: {
      type: [String],
      default: [],
    },
    suggestingPost: {
      type: [Post],
      default: [],
    },
  },
  { timestamps: true }
)

const Setting = mongoose.model('Setting', settingSchema, 'settings')

module.exports = Setting
