const express = require("express");
const userRouter = require("./user.router");
const hotelRouter = require("./hotel.router");
const bookingRouter = require("./booking.router");
const accountRouter = require("./account.router");

const router = (app) => {
  const version = "/api/v1";
  app.use(`${version}/hotel`, hotelRouter);
  app.use(`${version}/users`, userRouter);
  app.use(`${version}/booking`, bookingRouter);
  app.use(`${version}/admin`, accountRouter);
};

module.exports = router;
