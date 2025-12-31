const BASE_URL = import.meta.env.VITE_API_BASE || import.meta.env.VITE_API_URL || "http://localhost:3001/api";

let authToken = localStorage.getItem("veloceeo_token") || null;

export const setAuthToken = (token) => {
  authToken = token;
  if (token) {
    localStorage.setItem("veloceeo_token", token);
  } else {
    localStorage.removeItem("veloceeo_token");
  }
};

const api = async (url, method, body = null, optionsOverride = {}) => {
  const options = {
    method,
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include", // Allow sending cookies
    ...optionsOverride,
  };

  if (authToken) {
    options.headers["Authorization"] = `Bearer ${authToken}`;
  }

  if (body) {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(BASE_URL + url, options);
  
  if (response.status === 401 && !optionsOverride.skipTokenClear) {
    // Clear token on 401 Unauthorized
    setAuthToken(null);
  }

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "API Error");
  }

  return data;
};

export const apiGet = (url, options = {}) => api(url, "GET", null, options);
export const apiPost = (url, body, options = {}) => api(url, "POST", body, options);
export const apiPatch = (url, body, options = {}) => api(url, "PATCH", body, options);
export const apiPut = (url, body, options = {}) => api(url, "PUT", body, options);
export const apiDelete = (url, options = {}) => api(url, "DELETE", null, options);

export const cartAPI = {
  get: () => api("/cart", "GET"),
  add: (productId, quantity) => {
    const qty = Math.floor(Number(quantity));
    const pid = Math.floor(Number(productId));
    if (isNaN(pid) || pid <= 0) throw new Error("Invalid Product ID");
    if (isNaN(qty) || qty <= 0) throw new Error("Invalid Quantity");
    return api("/cart", "POST", { productId: pid, quantity: qty });
  },
  update: (productId, quantity) => {
    const qty = Math.floor(Number(quantity));
    const pid = Math.floor(Number(productId));
    if (isNaN(pid) || pid <= 0) throw new Error("Invalid Product ID");
    if (isNaN(qty) || qty < 0) throw new Error("Invalid Quantity");
    return api("/cart", "PUT", { productId: pid, quantity: qty });
  },
  remove: (productId) => api(`/cart/${productId}`, "DELETE"),
  clear: () => api("/cart", "DELETE"),
};

export const reviewAPI = {
  getReviewsForProduct: (productId) => api(`/reviews/${productId}`, "GET"),
  addReview: (productId, rating, review_text) =>
    api(`/reviews/${productId}`, "POST", { 
      rating: Number(rating), 
      review_text: String(review_text || "") 
    }),
  updateReview: (reviewId, rating, review_text) =>
    api(`/reviews/${reviewId}`, "PUT", { 
      rating: rating ? Number(rating) : undefined, 
      review_text: review_text !== undefined ? String(review_text) : undefined 
    }),
  deleteReview: (reviewId) => api(`/reviews/${reviewId}`, "DELETE"),
};