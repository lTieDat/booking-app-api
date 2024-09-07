const mongoose = require("mongoose");

const forgotPasswordSchema = new mongoose.Schema({
    email: String,
    otp:String,
    expiredAt: {
        type: Date,
        default: Date.now()
    }
},{
    timestamps: true
});

const forgotPassword = mongoose.model('forgotPassword', forgotPasswordSchema, 'forgot-password');

module.exports = forgotPassword;