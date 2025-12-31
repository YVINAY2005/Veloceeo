import React, { useState, useEffect } from 'react';
import { reviewAPI } from '../api';

const Reviews = ({ productId }) => {
  const [reviews, setReviews] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [rating, setRating] = useState(5);
  const [reviewText, setReviewText] = useState('');

  const fetchReviews = async () => {
    try {
      setLoading(true);
      const reviewsData = await reviewAPI.getReviewsForProduct(productId);
      setReviews(reviewsData.data.reviews);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReviews();
  }, [productId]);

  const handleAddReview = async (e) => {
    e.preventDefault();
    try {
      await reviewAPI.addReview(productId, rating, reviewText);
      setRating(5);
      setReviewText('');
      fetchReviews();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleUpdateReview = async (reviewId, newRating, newReviewText) => {
    try {
      await reviewAPI.updateReview(reviewId, newRating, newReviewText);
      fetchReviews();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDeleteReview = async (reviewId) => {
    try {
      await reviewAPI.deleteReview(reviewId);
      fetchReviews();
    } catch (err) {
      setError(err.message);
    }
  };

  if (loading) {
    return <div>Loading reviews...</div>;
  }

  if (error) {
    return <div>Error: {error}</div>;
  }

  return (
    <div className="reviews-container">
      <h2>Product Reviews</h2>
      <div className="reviews-list">
        {reviews.map((review) => (
          <div key={review.id} className="review-item">
            <p>Rating: {review.rating}/5</p>
            <p>{review.review_text}</p>
            {/* TODO: Add logic to only show buttons to the user who created the review */}
            <button onClick={() => handleUpdateReview(review.id, 5, 'Updated text')}>Update</button>
            <button onClick={() => handleDeleteReview(review.id)}>Delete</button>
          </div>
        ))}
      </div>
      <div className="add-review-form">
        <h3>Add a Review</h3>
        <form onSubmit={handleAddReview}>
          <div>
            <label>Rating:</label>
            <select value={rating} onChange={(e) => setRating(e.target.value)}>
              <option value="1">1</option>
              <option value="2">2</option>
              <option value="3">3</option>
              <option value="4">4</option>
              <option value="5">5</option>
            </select>
          </div>
          <div>
            <label>Review:</label>
            <textarea
              value={reviewText}
              onChange={(e) => setReviewText(e.target.value)}
            ></textarea>
          </div>
          <button type="submit">Submit Review</button>
        </form>
      </div>
      <style>{`
        .reviews-container {
          border: 1px solid #ccc;
          padding: 20px;
          margin: 20px;
          border-radius: 5px;
        }
        .review-item {
          border-bottom: 1px solid #eee;
          padding: 10px 0;
        }
        .add-review-form {
          margin-top: 20px;
        }
      `}</style>
    </div>
  );
};

export default Reviews;
