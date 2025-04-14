const User = require('../../../models/user.model')
const Prefix = require('../../../models/prefixPhone.model')
const md5 = require('md5')
const { generateRandomString } = require('../../../helper/generate')
const mailHelper = require('../../../helper/sendmail')
const Account = require('../../../models/account.model')
const Hotel = require('../../../models/hotelDetail.model')
const Booking = require('../../../models/booking.model')
const Room = require('../../../models/room.model')
const Post = require('../../../models/post.model')
const Setting = require('../../../models/setting.model')

// Helper function to exclude sensitive fields
const excludeSensitiveFields = (data) => {
  const { password, ...safeData } = data.toObject ? data.toObject() : data
  return safeData
}

//[GET] /api/v1/admin/DashboardData/:adminId
module.exports.getDashboardData = async (req, res) => {
  try {
    const { adminId } = req.params
    const manager = await Account.findOne({ token: adminId })
    if (!manager) {
      return res.status(404).json({ message: 'Manager not found' })
    }

    const hotelIds = manager.hotel_id
    const [rooms, hotels, bookings] = await Promise.all([
      Room.find({ HotelId: { $in: hotelIds } }),
      Hotel.find({ HotelId: { $in: hotelIds } }),
      Booking.find({ hotelId: { $in: hotelIds } }),
    ])

    const pendingBookings = bookings.filter((booking) => booking.status === 'pending')
    const paidBookings = bookings.filter((booking) => booking.status === 'paid')
    const confirmedBookings = bookings.filter((booking) => booking.status === 'confirmed')

    const totalRevenue = hotels.map((hotel) => {
      const hotelBookings = bookings.filter((booking) => booking.hotelId === hotel.HotelId)
      return {
        hotelId: hotel.HotelName,
        totalRevenue: hotelBookings.reduce((sum, booking) => sum + booking.totalAmount, 0),
      }
    })

    const hotelRoomData = hotels.map((hotel) => {
      const hotelRooms = rooms.filter((room) => room.HotelId === hotel.HotelId)
      const totalRooms = hotelRooms.reduce((sum, room) => sum + room.MaxQuantity, 0)
      const freeRooms = hotelRooms.reduce((sum, room) => sum + room.NumberAvailable, 0)
      return {
        hotelId: hotel.HotelName,
        totalRooms,
        bookedRooms: totalRooms - freeRooms,
        freeRooms,
      }
    })

    return res.status(200).json({
      message: 'Dashboard data fetched successfully',
      data: {
        totalHotels: hotels.length,
        totalBookings: bookings.length,
        pendingBookings: pendingBookings.length,
        paidBookings: paidBookings.length,
        confirmedBookings: confirmedBookings.length,
        totalRevenue,
        hotelRoomData,
      },
    })
  } catch (error) {
    console.error('Error fetching dashboard data:', error)
    return res.status(500).json({ message: 'Internal server error', error })
  }
}

//[POST] /admin/login
module.exports.adminLogin = async (req, res) => {
  try {
    const { email, password } = req.body
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' })
    }

    const account = await Account.findOne({ email })
    if (!account) {
      return res.status(404).json({ message: 'Email not found' })
    }

    if (account.password !== md5(password)) {
      return res.status(401).json({ message: 'Incorrect password' })
    }

    return res.status(200).json({
      message: 'Login successful',
      token: account.token,
      data: excludeSensitiveFields(account),
    })
  } catch (error) {
    console.error('Error during login:', error)
    return res.status(500).json({ message: 'Internal server error', error })
  }
}

//[GET] /api/v1/admin/me
module.exports.adminMe = async (req, res) => {
  try {
    const { tokenID } = req.query
    if (!tokenID) {
      return res.status(400).json({ message: 'Token is required' })
    }

    const account = await Account.findOne({ token: tokenID })
    if (!account) {
      return res.status(404).json({ message: 'Account not found' })
    }

    return res.status(200).json({
      message: 'Account details fetched successfully',
      data: excludeSensitiveFields(account),
    })
  } catch (error) {
    console.error('Error fetching account:', error)
    return res.status(500).json({ message: 'Internal server error', error })
  }
}

//[GET] /admin/superAdmin/accounts
module.exports.getAccounts = async (req, res) => {
  try {
    const accounts = await Account.find()
    const safeAccounts = accounts.map(excludeSensitiveFields)

    return res.status(200).json({
      message: 'Accounts fetched successfully',
      data: safeAccounts,
    })
  } catch (error) {
    console.error('Error fetching accounts:', error)
    return res.status(500).json({ message: 'Internal server error', error })
  }
}

//[POST] /admin/superAdmin/account
module.exports.createAccount = async (req, res) => {
  try {
    const { email, password, role } = req.body
    if (!email || !password || !role) {
      return res.status(400).json({ message: 'Email, password, and role are required' })
    }

    const existingAccount = await Account.findOne({ email })
    if (existingAccount) {
      return res.status(409).json({ message: 'Email already exists' })
    }

    const token = generateRandomString(20)
    const newAccount = new Account({
      email,
      password: md5(password),
      role,
      token,
    })

    await newAccount.save()
    return res.status(201).json({
      message: 'Account created successfully',
      data: excludeSensitiveFields(newAccount),
    })
  } catch (error) {
    console.error('Error creating account:', error)
    return res.status(500).json({ message: 'Internal server error', error })
  }
}

//[PUT] /admin/superAdmin/account/:accountId
module.exports.updateAccount = async (req, res) => {
  try {
    const { accountId } = req.params
    const { email, password, role } = req.body

    const account = await Account.findById(accountId)
    if (!account) {
      return res.status(404).json({ message: 'Account not found' })
    }

    if (email) account.email = email
    if (password) account.password = md5(password)
    if (role) account.role = role

    await account.save()
    return res.status(200).json({
      message: 'Account updated successfully',
      data: excludeSensitiveFields(account),
    })
  } catch (error) {
    console.error('Error updating account:', error)
    return res.status(500).json({ message: 'Internal server error', error })
  }
}

//[DELETE] /admin/superAdmin/account/:accountId
module.exports.deleteAccount = async (req, res) => {
  try {
    const { accountId } = req.params
    const account = await Account.findById(accountId)
    if (!account) {
      return res.status(404).json({ message: 'Account not found' })
    }

    await account.deleteOne()
    return res.status(200).json({ message: 'Account deleted successfully' })
  } catch (error) {
    console.error('Error deleting account:', error)
    return res.status(500).json({ message: 'Internal server error', error })
  }
}

//[GET] /admin/superAdmin/posts
module.exports.getPosts = async (req, res) => {
  try {
    const posts = await Post.find()
    return res.status(200).json({
      message: 'Posts fetched successfully',
      data: posts,
    })
  } catch (error) {
    console.error('Error fetching posts:', error)
    return res.status(500).json({ message: 'Internal server error', error })
  }
}

//[POST] /admin/superAdmin/post
module.exports.createPost = async (req, res) => {
  try {
    const { title, content } = req.body
    if (!title || !content) {
      return res.status(400).json({ message: 'Title and content are required' })
    }

    const newPost = new Post({ title, content })
    await newPost.save()
    return res.status(201).json({
      message: 'Post created successfully',
      data: newPost,
    })
  } catch (error) {
    console.error('Error creating post:', error)
    return res.status(500).json({ message: 'Internal server error' })
  }
}

//[PUT] /admin/superAdmin/post/:postId
module.exports.updatePost = async (req, res) => {
  try {
    const { postId } = req.params
    const { title, content } = req.body

    const post = await Post.findById(postId)
    if (!post) {
      return res.status(404).json({ message: 'Post not found' })
    }

    if (title) post.title = title
    if (content) post.content = content

    await post.save()
    return res.status(200).json({
      message: 'Post updated successfully',
      data: post,
    })
  } catch (error) {
    console.error('Error updating post:', error)
    return res.status(500).json({ message: 'Internal server error', error })
  }
}

//[DELETE] /admin/superAdmin/post/:postId
module.exports.deletePost = async (req, res) => {
  try {
    const { postId } = req.params
    const post = await Post.findById(postId)
    if (!post) {
      return res.status(404).json({ message: 'Post not found' })
    }

    await post.deleteOne()
    return res.status(200).json({ message: 'Post deleted successfully' })
  } catch (error) {
    console.error('Error deleting post:', error)
    return res.status(500).json({ message: 'Internal server error', error })
  }
}

//[GET] /admin/superAdmin/displayedPosts
module.exports.getDisplayedPosts = async (req, res) => {
  try {
    const topCities = await Booking.aggregate([
      {
        $lookup: {
          from: 'hotels',
          localField: 'hotelId',
          foreignField: 'HotelId',
          as: 'hotelInfo',
        },
      },
      { $unwind: '$hotelInfo' },
      {
        $group: {
          _id: '$hotelInfo.Address.City',
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
      { $limit: 5 },
    ])

    const cityNames = topCities.map((city) => city._id)
    const displayedPosts = await Post.find({ keyword: { $in: cityNames } })

    return res.status(200).json({
      message: 'Displayed posts fetched successfully',
      data: displayedPosts,
    })
  } catch (error) {
    console.error('Error fetching displayed posts:', error)
    return res.status(500).json({ message: 'Internal server error' })
  }
}

//[GET] /admin/superAdmin/displayedPlaces
module.exports.getDisplayedPlaces = async (req, res) => {
  try {
    const topCountries = await Booking.aggregate([
      {
        $lookup: {
          from: 'hotels',
          localField: 'hotelId',
          foreignField: 'HotelId',
          as: 'hotelInfo',
        },
      },
      { $unwind: '$hotelInfo' },
      {
        $group: {
          _id: '$hotelInfo.Address.Country',
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
      { $limit: 5 },
    ])

    const countryNames = topCountries.map((country) => country._id)
    const displayedPlaces = await Post.find({ keyword: { $in: countryNames } })

    return res.status(200).json({
      message: 'Displayed places fetched successfully',
      data: displayedPlaces,
    })
  } catch (error) {
    console.error('Error fetching displayed places:', error)
    return res.status(500).json({ message: 'Internal server error' })
  }
}

//[GET] /admin/superAdmin/displayedPostByID
module.exports.getDisplayedPostByID = async (req, res) => {
  try {
    const { postId } = req.query
    if (!postId) {
      return res.status(400).json({ message: 'Post ID is required' })
    }

    const post = await Post.findById(postId)
    if (!post) {
      return res.status(404).json({ message: 'Post not found' })
    }

    return res.status(200).json({
      message: 'Post fetched successfully',
      data: post,
    })
  } catch (error) {
    console.error('Error fetching displayed post:', error)
    return res.status(500).json({ message: 'Internal server error' })
  }
}

//[GET] /admin/superAdmin/displayedHotels
module.exports.getDisplayedHotels = async (req, res) => {
  try {
    const topHotels = await Booking.aggregate([
      {
        $group: {
          _id: '$hotelId',
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
      { $limit: 5 },
    ])

    const hotelIds = topHotels.map((hotel) => hotel._id)
    const displayedHotels = await Hotel.find({ HotelId: { $in: hotelIds } })

    return res.status(200).json({
      message: 'Displayed hotels fetched successfully',
      data: displayedHotels,
    })
  } catch (error) {
    console.error('Error fetching displayed hotels:', error)
    return res.status(500).json({ message: 'Internal server error' })
  }
}
