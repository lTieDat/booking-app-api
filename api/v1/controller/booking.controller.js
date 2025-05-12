const Booking = require('../../../models/booking.model.js')
const generate = require('../../../helper/generate')
const Room = require('../../../models/room.model.js')
const Review = require('../../../models/review.model.js')
const Hotel = require('../../../models/hotelDetail.model.js')

// [POST] /booking
module.exports.create = async (req, res) => {
  try {
    const { hotelId, userId = 'guest', booking, selectedRooms = [] } = req.body

    // Validate inputs
    // Test case: Khanh-Whitebox - CreateBooking_MissingHotelId_Fail (1.2)
    if (!hotelId) {
      return res.status(400).json({ message: 'Hotel ID is required.' })
    }
    // Test case: Khanh-Whitebox - CreateBooking_MissingBookingObject_Fail (1.3)
    if (!booking || !booking.startDate || !booking.endDate) {
      return res.status(400).json({ message: 'Booking dates are required.' })
    }
    const startDate = new Date(booking.startDate)
    const endDate = new Date(booking.endDate)
    // Test case: Khanh-Whitebox - CreateBooking_InvalidDateFormat_Fail (1.11)
    if (isNaN(startDate) || isNaN(endDate)) {
      return res.status(400).json({ message: 'Invalid date format.' })
    }
    // Test case: Khanh-Whitebox - CreateBooking_InvalidRoomSelection_Fail (1.8), CreateBooking_MissingSelectedRooms_Fail (1.10)
    if (selectedRooms.some((room) => !room.roomId || typeof room.quantity !== 'number' || room.quantity <= 0)) {
      return res.status(400).json({ message: 'Invalid room selection.' })
    }

    // Generate booking ID
    const bookingID = generate.generateRandomString(10)

    // Create new booking object
    // Test case: Khanh-Whitebox - CreateBooking_DefaultUserId_Success (1.4)
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

    // Test case: Khanh-Whitebox - CreateBooking_DBSaveFailure_Error (1.7)
    await newBooking.save()

    // Update room quantities
    // Test case: Khanh-Whitebox - CreateBooking_NonExistentRooms_Fail (1.6)
    const roomIDs = selectedRooms.map((room) => room.roomId)
    const rooms = await Room.find({ RoomId: { $in: roomIDs } })
    if (rooms.length !== roomIDs.length) {
      return res.status(400).json({ message: 'One or more rooms not found.' })
    }
    // Test case: Khanh-Whitebox - CreateBooking_RoomQuantityExceedsAvailability_Fail (1.12)
    await Promise.all(
      rooms.map(async (room) => {
        const selectedRoom = selectedRooms.find((r) => r.roomId === room.RoomId)
        if (selectedRoom.quantity > room.NumberAvailable) {
          throw new Error(`Not enough rooms available for ${room.RoomId}`)
        }
        room.NumberAvailable -= selectedRoom.quantity
        // Test case: Khanh-Whitebox - CreateBooking_RoomUpdateFailure_Error (1.9)
        await room.save()
      })
    )

    // Test case: Khanh-Whitebox - CreateBooking_Success_Success (1.1) - Main logic path
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
    // Test case: Khanh-Whitebox - GetBooking_EmptyBookingId_Fail (2.4)
    const booking = await Booking.findOne({ bookingId: req.params.bookingId })
    // Test case: Khanh-Whitebox - GetBooking_NonExistentBooking_Fail (2.2)
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found.' })
    }
    // Test case: Khanh-Whitebox - GetBooking_Success_Success (2.1) - Main logic path
    res.status(200).json({ data: booking })
  } catch (error) {
    // Test case: Khanh-Whitebox - GetBooking_DBError_Error (2.3)
    console.error('Booking get error:', error)
    res.status(500).json({ message: 'Internal server error.' })
  }
}

// [POST] /booking/:bookingId/update
module.exports.updateBooking = async (req, res) => {
  try {
    // Test case: Khanh-Whitebox - UpdateBooking_NonExistentBooking_Fail (4.2), UpdateBooking_InvalidBookingIdFormat_Fail (4.7)
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
    // Test case: Khanh-Whitebox - UpdateBooking_PartialUpdate_Success (4.3), UpdateBooking_EmptyUpdateObject_Success (4.6)
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
    // Test case: Khanh-Whitebox - UpdateBooking_DBSaveFailure_Error (4.5)
    await booking.save()
    // Test case: Khanh-Whitebox - UpdateBooking_FullDataUpdate_Success (4.1) - Main logic path
    res.status(200).json({ message: 'Booking updated successfully.', status: 200 })
  } catch (error) {
    // Test case: Khanh-Whitebox - UpdateBooking_InvalidDataTypes_Fail (4.4)
    console.error('Booking update error:', error)
    res.status(500).json({ message: 'Internal server error.', status: 500 })
  }
}

// [GET] /booking/bookingHistory/:email
module.exports.getBookingsByEmail = async (req, res) => {
  try {
    // Test case: Khanh-Whitebox - GetBookingsByEmail_MultipleBookings_Success (5.7), GetBookingsByEmail_InvalidEmail_Fail (5.4)
    const bookings = await Booking.find({ customerEmail: req.params.email })
    // Test case: Khanh-Whitebox - GetBookingsByEmail_NoBookings_Fail (5.3)
    if (!bookings.length) {
      return res.status(404).json({ message: 'Booking not found.' })
    }
    // Test case: Khanh-Whitebox - GetBookingsByEmail_WithReviews_Success (5.1), GetBookingsByEmail_WithoutReviews_Success (5.2)
    const bookingsWithReviews = await Promise.all(
      bookings.map(async (booking) => {
        // Test case: Khanh-Whitebox - GetBookingsByEmail_ReviewQueryFailure_Error (5.6)
        const review = await Review.findOne({ bookingId: booking.bookingId })
        return {
          ...booking.toObject(),
          review: review || 'no reviews',
        }
      })
    )
    // Test case: Khanh-Whitebox - GetBookingsByEmail_Success_Success (5.1, 5.2) - Main logic path
    res.status(200).json({ data: bookingsWithReviews })
  } catch (error) {
    // Test case: Khanh-Whitebox - GetBookingsByEmail_DBError_Error (5.5)
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
    // Test case: Khanh-Whitebox - GetBookingsByHotelId_FilterByStatus_Success (6.2)
    if (filterStatus?.trim()) {
      query.status = filterStatus.trim()
    }
    // Test case: Khanh-Whitebox - GetBookingsByHotelId_SearchByCustomerName_Success (6.3), GetBookingsByHotelId_SpecialCharactersSearch_Success (6.16)
    if (searchQuery?.trim()) {
      query.customerName = { $regex: searchQuery.trim(), $options: 'i' }
    }
    // Test case: Khanh-Whitebox - GetBookingsByHotelId_FilterByMonth_Success (6.17)
    if (month?.trim() && month !== 'undefined') {
      query.createdDate = { $regex: `-${month.padStart(2, '0')}-` }
    }

    let sort = { createdDate: -1 }
    // Test case: Khanh-Whitebox - GetBookingsByHotelId_SortByTotalAmountAsc_Success (6.4), SortByTotalAmountDesc_Success (6.9), SortByNumberOfGuest_Success (6.10)
    switch (sortBy?.trim()) {
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
    // Test case: Khanh-Whitebox - GetBookingsByHotelId_Pagination_Success (6.5), NegativePageNumber_Fail (6.13), ZeroItemsPerPage_Fail (6.14)
    const bookings = await Booking.find(query)
      .sort(sort)
      .skip((page - 1) * itemsPerPage)
      .limit(Number(itemsPerPage))

    console.log('Bookings:', bookings.length)
    // Test case: Khanh-Whitebox - GetBookingsByHotelId_EmptyForInvalidHotelId_Success (6.6)
    const totalItems = await Booking.countDocuments(query)
    const totalPages = Math.ceil(totalItems / itemsPerPage)
    // Test case: Khanh-Whitebox - GetBookingsByHotelId_HotelNotFound_Success (6.11), HotelQueryFailure_Error (6.15)
    const hotel = await Hotel.findOne({ HotelId: hotelId })
    const bookingsWithHotelName = bookings.map((booking) => ({
      ...booking.toObject(),
      hotelName: hotel ? hotel.HotelName : 'Unknown',
    }))
    // Test case: Khanh-Whitebox - GetBookingsByHotelId_NoFilters_Success (6.1), EmptySearchQuery_Success (6.12) - Main logic path
    res.status(200).json({ bookings: bookingsWithHotelName, totalPages })
  } catch (error) {
    // Test case: Khanh-Whitebox - GetBookingsByHotelId_DBError_Error (6.7), SearchMissingCustomerName_Fail (6.8)
    console.error('Booking get error:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
}

// [DELETE] /booking/:bookingId
module.exports.deleteBooking = async (req, res) => {
  try {
    // Test case: Khanh-Whitebox - DeleteBooking_NonExistentBooking_Fail (3.2)
    const booking = await Booking.findOne({ bookingId: req.params.bookingId })
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found.' })
    }
    // Test case: Khanh-Whitebox - DeleteBooking_DeleteFailure_Error (3.4)
    await booking.deleteOne()
    // Test case: Khanh-Whitebox - DeleteBooking_Success_Success (3.1) - Main logic path
    res.status(200).json({ message: 'Booking deleted successfully.' })
  } catch (error) {
    // Test case: Khanh-Whitebox - DeleteBooking_DBFindError_Error (3.3)
    console.error('Booking delete error:', error)
    res.status(500).json({ message: 'Internal server error.' })
  }
}
