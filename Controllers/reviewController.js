const Book = require("../Models/bookModel");
const Review = require("../Models/reviewModel");
const asyncHandler = require("express-async-handler");
const { validationResult } = require("express-validator");

exports.getAllReviews = asyncHandler(async (req, res) => {
  const reviews = await Review.find();
  if (reviews.length === 0) {
    return res.status(404).json({ message: "No reviews found" });
  }
  res.status(200).json({ result: reviews.length, reviews });
});

exports.getUserReviews = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const reviews = await Review.find({ user: userId });
  if (reviews.length === 0) {
    return res.status(404).json({ message: "No reviews found" });
  }
  res.status(200).json({ result: reviews.length, reviews });
});

// @desc    create a new review for a book
// @route   POST /api/v1/books/:bookId/reviews
// @access  private
exports.createReview = asyncHandler(async (req, res) => {
  const { id: bookId } = req.params;
  const { rating, comment } = req.body;
  const userId = req.user._id;

  //check if the book exists
  const book = await Book.findById(bookId);
  if (!book) {
    return res.status(404).json({ message: "Book not found" });
  }

  //check if user already reviewed this book
  const existingReview = await Review.findOne({ book: bookId, user: userId });
  if (existingReview) {
    return res.status(400).json({ message: "You have already reviewed this book" });
  }

  //create a review
  const review = await Review.create({
    user: userId,
    book: bookId,
    rating,
    comment
  });

  res.status(201).json({ message: "Review added successfully", review });
});

// @desc    update an existing review
// @route   PATCH /api/v1/reviews/:reviewId
// @access  private 
exports.updateReview = asyncHandler(async (req, res) => {
  const { id: reviewId } = req.params;
  const { rating, comment } = req.body;

  //find the review
  const review = await Review.findById(reviewId);
  if (!review) {
    return res.status(404).json({ message: "Review not found" });
  }

  //update a review
  if (rating !== undefined) review.rating = rating;
  if (comment !== undefined) review.comment = comment;
  await review.save();

  res.status(200).json({ message: "Review updated successfully", review });
});

// @desc    Get a book and its reviews
// @route   GET /api/v1/books/:id/reviews
// @access  Public
exports.getBookWithReviews = asyncHandler(async (req, res) => {
  const { id: bookId } = req.params;
  const book = await Book.findById(bookId);
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 5;
  const skip = (page - 1) * limit;

  //get total review count for pagination
  const totalReviews = await Review.countDocuments({ book: bookId });

  //get reviews with pagination
  let reviews = await Review.find({ book: bookId })
    .populate({ path: "user", select: "name email" })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);


  res.status(200).json({
    book: {
      _id: book._id,
      title: book.title,
      author: book.author,
      avgRating: book.averageRating || 0,
      numReviews: book.reviews.length || 0,
    },
    reviews,
    totalReviews,
    page,
    totalPages: Math.ceil(totalReviews / limit),
  });
});


// @desc    delete a review
// @route   DELETE /api/v1/reviews/:reviewId
// @access  private (Review owner or Admin)
exports.deleteReview = asyncHandler(async (req, res) => {
  const { id: reviewId } = req.params;

  // Find the review
  const review = await Review.findById(reviewId);
  if (!review) {
    return res.status(404).json({ message: "Review not found" });
  }

  // Check permissions
  if (req.user.role !== "admin" && req.user._id.toString() !== review.user.toString()) {
    return res.status(403).json({ message: "You are not authorized to delete this review" });
  }
  await review.deleteOne()
  await Review.calculateAverageRating(review.book);

  res.status(200).json({ message: "Review deleted successfully" });
});
