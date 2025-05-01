const Booking = require('../../../models/booking.model.js')
const generate = require('../../../helper/generate')
const Room = require('../../../models/room.model.js')
const Review = require('../../../models/review.model.js')
const Hotel = require('../../../models/hotelDetail.model.js')

// [POST] /booking
// module.exports.create = async (req, res) => {
//   try {
//     const { hotelId, userId = 'guest', booking, selectedRooms } = req.body
//     // Generate booking ID
//     const bookingID = generate.genenrateRandomString(10)

//     // Create new booking object
//     const newBooking = new Booking({
//       bookingId: bookingID,
//       hotelId,
//       userId,
//       checkInDate: booking.startDate,
//       checkOutDate: booking.endDate,
//       rooms: selectedRooms,
//       status: 'pending',
//       numberOfAdults: booking.adults,
//       numberOfChildren: booking.children,
//     })

//     await newBooking.save()
//     if (!newBooking) {
//       console.error('Booking creation failed.', error)
//     }
//     // Get list of room IDs
//     const roomIDs = selectedRooms.map((room) => room.roomId)

//     // Update room quantities
//     const rooms = await Room.find({ RoomId: { $in: roomIDs } })
//     await Promise.all(
//       rooms.map(async (room) => {
//         const selectedRoom = selectedRooms.find((r) => r.roomId === room.RoomId.toString())
//         room.NumberAvailable -= selectedRoom.quantity
//         await room.save()
//       })
//     )

//     res.status(200).json({
//       message: 'Booking created successfully.',
//       data: newBooking.bookingId,
//     })
//   } catch (error) {
//     console.error('Booking create error:', error)
//   }
// }
// [POST] /booking
//[POST] /booking/:bookingId/update

// [POST] /booking
module.exports.create = async (req, res) => {
  try {
    const { hotelId, userId = 'guest', booking, selectedRooms = [] } = req.body

    // Validate inputs
    if (!hotelId) {
      return res.status(400).json({ message: 'Hotel ID is required.' })
    }
    if (!booking || !booking.startDate || !booking.endDate) {
      return res.status(400).json({ message: 'Booking dates are required.' })
    }
    const startDate = new Date(booking.startDate)
    const endDate = new Date(booking.endDate)
    if (isNaN(startDate) || isNaN(endDate)) {
      return res.status(400).json({ message: 'Invalid date format.' })
    }
    if (selectedRooms.some((room) => !room.roomId || typeof room.quantity !== 'number' || room.quantity <= 0)) {
      return res.status(400).json({ message: 'Invalid room selection.' })
    }

    // Generate booking ID
    const bookingID = generate.generateRandomString(10) // Fixed typo

    // Create new booking object
    const newBooking = new Booking({
      bookingId: bookingID,
      hotelId,
      userId,
      checkInDate: startDate,
      checkOutDate: endDate,
      rooms: selectedRooms,
      status: 'pending',
      numberOfAdults: booking.adults || 0,
      numberOfChildren: booking.children || 0,
    })

    await newBooking.save()

    // Update room quantities
    const roomIDs = selectedRooms.map((room) => room.roomId)
    const rooms = await Room.find({ RoomId: { $in: roomIDs } })
    if (rooms.length !== roomIDs.length) {
      return res.status(400).json({ message: 'One or more rooms not found.' })
    }
    await Promise.all(
      rooms.map(async (room) => {
        const selectedRoom = selectedRooms.find((r) => r.roomId === room.RoomId)
        if (selectedRoom.quantity > room.NumberAvailable) {
          throw new Error(`Not enough rooms available for ${room.RoomId}`)
        }
        room.NumberAvailable -= selectedRoom.quantity
        await room.save()
      })
    )

    res.status(200).json({
      message: 'Booking created successfully.',
      data: newBooking.bookingId,
    })
  } catch (error) {
    console.error('Booking create error:', error)
    res.status(500).json({ message: error.message || 'Internal server error.' })
  }
}

// [GET] /booking/:bookingId
module.exports.getBooking = async (req, res) => {
  try {
    const booking = await Booking.findOne({ bookingId: req.params.bookingId })
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found.' })
    }
    res.status(200).json({ data: booking })
  } catch (error) {
    console.error('Booking get error:', error)
    res.status(500).json({ message: 'Internal server error.' })
  }
}

// [POST] /booking/:bookingId/update
module.exports.updateBooking = async (req, res) => {
  try {
    const booking = await Booking.findOne({ bookingId: req.params.bookingId })
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found.', status: 404 })
    }
    const {
      fullName,
      email,
      phoneNo,
      country,
      notes,
      arrivalTime,
      finalPrice,
      airportShuttle,
      rentalCar,
      taxiShuttle,
      specialRequest,
    } = req.body
    booking.customerName = fullName || booking.customerName
    booking.customerEmail = email || booking.customerEmail
    booking.customerPhone = phoneNo || booking.customerPhone
    booking.customerCountry = country || booking.customerCountry
    booking.notes = notes || booking.notes
    booking.arrivalTime = arrivalTime || booking.arrivalTime
    booking.totalAmount = finalPrice !== undefined ? finalPrice : booking.totalAmount
    booking.airportShuttle = airportShuttle !== undefined ? airportShuttle : booking.airportShuttle
    booking.rentalCar = rentalCar !== undefined ? rentalCar : booking.rentalCar
    booking.taxiShuttle = taxiShuttle !== undefined ? taxiShuttle : booking.taxiShuttle
    booking.specialRequest = specialRequest || booking.specialRequest
    await booking.save()
    res.status(200).json({ message: 'Booking updated successfully.', status: 200 })
  } catch (error) {
    console.error('Booking update error:', error)
    res.status(500).json({ message: 'Internal server error.', status: 500 })
  }
}

// [GET] /booking/bookingHistory/:email
module.exports.getBookingsByEmail = async (req, res) => {
  try {
    const bookings = await Booking.find({ customerEmail: req.params.email })
    if (!bookings.length) {
      return res.status(404).json({ message: 'Booking not found.' })
    }
    const bookingsWithReviews = await Promise.all(
      bookings.map(async (booking) => {
        const review = await Review.findOne({ bookingId: booking.bookingId })
        return {
          ...booking.toObject(),
          review: review || 'no reviews',
        }
      })
    )
    res.status(200).json({ data: bookingsWithReviews })
  } catch (error) {
    console.error('Booking get error:', error)
    res.status(500).json({ message: 'Internal server error.' })
  }
}

// [GET] /booking/bookingHistory/manager/:hotelId
module.exports.getBookingsByHotelId = async (req, res) => {
  try {
    const { hotelId } = req.params
    const { filterStatus, sortBy, searchQuery, page = 1, itemsPerPage = 10, month } = req.query
    let query = { hotelId }
    if (filterStatus) {
      query.status = filterStatus
    }
    if (searchQuery) {
      query.customerName = { $regex: searchQuery, $options: 'i' }
    }

    let sort = { createdDate: -1 }
    switch (sortBy) {
      case 'totalAmountAsc':
        sort = { totalAmount: 1 }
        break
      case 'totalAmountDesc':
        sort = { totalAmount: -1 }
        break
      case 'numberOfGuest':
        sort = { numberOfAdults: -1, numberOfChildren: -1 }
        break
    }
    const bookings = await Booking.find(query)
      .sort(sort)
      .skip((page - 1) * itemsPerPage)
      .limit(Number(itemsPerPage))
    const totalItems = await Booking.countDocuments(query)
    const totalPages = Math.ceil(totalItems / itemsPerPage)
    const hotel = await Hotel.findOne({ HotelId: hotelId })
    const bookingsWithHotelName = bookings.map((booking) => ({
      ...booking.toObject(),
      hotelName: hotel ? hotel.HotelName : 'Unknown',
    }))
    res.status(200).json({ bookings: bookingsWithHotelName, totalPages })
  } catch (error) {
    console.error('Booking get error:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
}

// [DELETE] /booking/:bookingId
module.exports.deleteBooking = async (req, res) => {
  try {
    const booking = await Booking.findOne({ bookingId: req.params.bookingId })
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found.' })
    }
    await booking.deleteOne()
    res.status(200).json({ message: 'Booking deleted successfully.' })
  } catch (error) {
    console.error('Booking delete error:', error)
    res.status(500).json({ message: 'Internal server error.' })
  }
}
