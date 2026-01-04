import { useEffect, useState, useRef } from "react";
import { apiGet, apiPost, apiPatch, apiDelete, setAuthToken, cartAPI } from "./api";

const RAZORPAY_KEY_ID = "rzp_test_PLACEHOLDER";


export default function VeloceeoMVP() {
  const [sellers, setSellers] = useState([]);
  const [products, setProducts] = useState([]);
  const [sellerProductsFilter, setSellerProductsFilter] = useState({ search: "", category: "all", status: "all", sort: "newest" });
  const [editingProductId, setEditingProductId] = useState(null);

  const filteredSellerProducts = products
    .filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(sellerProductsFilter.search.toLowerCase());
      const matchesCategory = sellerProductsFilter.category === "all" || p.category?.name === sellerProductsFilter.category || p.category === sellerProductsFilter.category;
      const matchesStatus = sellerProductsFilter.status === "all" || (sellerProductsFilter.status === "active" ? p.is_active : !p.is_active);
      return matchesSearch && matchesCategory && matchesStatus;
    })
    .sort((a, b) => {
      if (sellerProductsFilter.sort === "newest") return new Date(b.created_at || 0) - new Date(a.created_at || 0);
      if (sellerProductsFilter.sort === "oldest") return new Date(a.created_at || 0) - new Date(b.created_at || 0);
      if (sellerProductsFilter.sort === "price-high") return (b.price_cents || 0) - (a.price_cents || 0);
      if (sellerProductsFilter.sort === "price-low") return (a.price_cents || 0) - (b.price_cents || 0);
      if (sellerProductsFilter.sort === "stock-low") return (a.stock_quantity || 0) - (b.stock_quantity || 0);
      return 0;
    });
  const [role, setRole] = useState(null);
  const [user, setUser] = useState(null);
  const [userSellerId, setUserSellerId] = useState(null);
  const [openStoreId, setOpenStoreId] = useState(null);
  const [view, setView] = useState("home");
  const [cart, setCart] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [offlineQueue, setOfflineQueue] = useState([]);
  const [highlightedItemId, setHighlightedItemId] = useState(null);
  const [cartNotification, setCartNotification] = useState(null); // { message, type: 'success' | 'error' | 'info' }
  const notificationTimerRef = useRef(null);
  const closingTimerRef = useRef(null);

  const notify = (message, type = 'info') => {
    // Clear any existing timers
    if (notificationTimerRef.current) clearTimeout(notificationTimerRef.current);
    if (closingTimerRef.current) clearTimeout(closingTimerRef.current);

    setCartNotification({ message, type, isClosing: false });
    
    // Start closing animation 400ms before removing (matching CSS animation duration)
    closingTimerRef.current = setTimeout(() => {
      setCartNotification(prev => prev ? { ...prev, isClosing: true } : null);
    }, 4600);

    notificationTimerRef.current = setTimeout(() => {
      setCartNotification(null);
    }, 5000);
  };

  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState("");
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [resetPasswordToken, setResetPasswordToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // forms
  const [sellerForm, setSellerForm] = useState({ 
    name: "", 
    email: "", 
    password: "", 
    phone: "", 
    pincode: "", 
    address: "" 
  });
  const [categoryForm, setCategoryForm] = useState({
    name: "",
    parentId: ""
  });
  const [adminUsers, setAdminUsers] = useState([]);
  const [editingUser, setEditingUser] = useState(null);
  const [productForm, setProductForm] = useState({ 
    id: null, 
    name: "", 
    price: "", 
    category: "", 
    categoryId: null,
    images: [], // Array of { url: string, is_primary: boolean, display_order: number }
    imageUrlInput: "", // New field for URL input
    qty: 0, 
    brand: "", 
    description: "",
    is_active: true 
  });

  const [filterMetadata, setFilterMetadata] = useState({ brands: [], categories: [] });
  const [activeFilters, setActiveFilters] = useState({
    minPrice: '',
    maxPrice: '',
    brands: [],
    categories: [],
    search: ''
  });

  // Profile state
  const [profileForm, setProfileForm] = useState({
    name: "",
    email: "",
    phone: "",
  });

  // Sync profile form when user changes
  useEffect(() => {
    if (user) {
      setProfileForm({
        name: user.name || "",
        email: user.email || "",
        phone: user.phone || "",
      });
    }
  }, [user]);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const mobileMenuRef = useRef(null);
  const filterRef = useRef(null);
  const profileMenuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      // If clicking the toggle buttons, let their own onClick handle it
      if (event.target.closest('.hamburger-menu') || 
          event.target.closest('.filter-toggle-btn') || 
          event.target.closest('.profile-container')) {
        return;
      }

      if (mobileMenuRef.current && !mobileMenuRef.current.contains(event.target)) {
        setIsMobileMenuOpen(false);
      }
      if (filterRef.current && !filterRef.current.contains(event.target)) {
        setIsFilterOpen(false);
      }
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target)) {
        setShowProfileMenu(false);
      }
    };
    if (isMobileMenuOpen || isFilterOpen || showProfileMenu) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isMobileMenuOpen, isFilterOpen, showProfileMenu]);
  const [brandSearch, setBrandSearch] = useState('');
  const [expandedCategories, setExpandedCategories] = useState({});

  // Review states
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [wishlist, setWishlist] = useState([]);
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [isZoomed, setIsZoomed] = useState(false);
  const [reviews, setReviews] = useState([]);
  const [reviewPage, setReviewPage] = useState(1);
  const [reviewTotalPages, setReviewTotalPages] = useState(1);
  const [reviewSort, setReviewSort] = useState("newest");
  const [avgRating, setAvgRating] = useState({ average: 0, count: 0, distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } });
  const [productCache, setProductCache] = useState({});
  const [newReview, setNewReview] = useState({ rating: 5, title: "", text: "", photos: [] });
  const [reviewLoading, setReviewLoading] = useState(false);
  const [sellerReviews, setSellerReviews] = useState([]);
  const [sellerReviewPage, setSellerReviewPage] = useState(1);
  const [sellerReviewTotalPages, setSellerReviewTotalPages] = useState(1);
  
  const reviewsRef = useRef(null);

  useEffect(() => {
    const handleEsc = (event) => {
      if (event.keyCode === 27) setIsProductModalOpen(false);
    };
    window.addEventListener('keydown', handleEsc);
    return () => {
      window.removeEventListener('keydown', handleEsc);
    };
  }, []);

  useEffect(() => {
    if (isProductModalOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
  }, [isProductModalOpen]);

  useEffect(() => {
    if ((view === "product-details" || isProductModalOpen) && selectedProduct) {
      const observer = new IntersectionObserver(
        (entries) => {
          if (entries[0].isIntersecting) {
            fetchReviews(selectedProduct.id);
            observer.disconnect();
          }
        },
        { threshold: 0.1 }
      );

      if (reviewsRef.current) {
        observer.observe(reviewsRef.current);
      }

      return () => observer.disconnect();
    }
  }, [view, isProductModalOpen, selectedProduct]);

  useEffect(() => {
    if (view === "seller-dashboard" && userSellerId) {
      fetchSellerReviews();
    }
  }, [view, userSellerId]);

  useEffect(() => {
    if (user && reviews.length > 0) {
      const myReview = reviews.find(r => r.customer_id === user.id);
      if (myReview) {
        setNewReview({
          rating: myReview.rating,
          title: myReview.title || "",
          text: myReview.review_text || "",
          photos: myReview.photos || []
        });
      }
    }
  }, [user, reviews]);

  useEffect(() => {
    const loadFilters = async () => {
      try {
        const resp = await apiGet('/product/filters');
        if (resp.status === 'success') {
          setFilterMetadata(resp.data);
        }
      } catch (e) {
        console.error("Failed to load filters", e);
      }
    };
    loadFilters();
  }, []);

  const applyFilters = async () => {
    try {
      setLoading(true);
      // If we're not in catalog, switch to it to show results
      if (view !== 'catalog') {
        setView('catalog');
      }
      const params = new URLSearchParams();
      if (activeFilters.search) params.append('name', activeFilters.search);
      if (activeFilters.minPrice) params.append('minPrice', activeFilters.minPrice * 100);
      if (activeFilters.maxPrice) params.append('maxPrice', activeFilters.maxPrice * 100);
      if (activeFilters.brands.length > 0) params.append('brands', activeFilters.brands.join(','));
      if (activeFilters.categories.length > 0) params.append('categories', activeFilters.categories.join(','));
      if (openStoreId) params.append('storeId', openStoreId);

      const resp = await apiGet(`/product/search?${params.toString()}`);
      setProducts(resp?.data?.products || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      if (role === 'customer') applyFilters();
    }, 500);
    return () => clearTimeout(timer);
  }, [activeFilters, role, openStoreId]);

  const resetFilters = () => {
    setActiveFilters({
      minPrice: '',
      maxPrice: '',
      brands: [],
      categories: [],
      search: ''
    });
  };

  const toggleBrand = (brand) => {
    setActiveFilters(prev => ({
      ...prev,
      brands: prev.brands.includes(brand) 
        ? prev.brands.filter(b => b !== brand)
        : [...prev.brands, brand]
    }));
  };

  // Review functions
  const fetchReviews = async (productId, page = 1, sort = reviewSort) => {
    if (!productId || productId === 'undefined') return;
    try {
      setReviewLoading(true);
      const reviewsResp = await apiGet(`/reviews/${productId}?page=${page}&sortBy=${sort}`);
      
      if (reviewsResp.status === 'success') {
        setReviews(reviewsResp.data.reviews);
        setReviewPage(reviewsResp.data.page);
        setReviewTotalPages(reviewsResp.data.totalPages);
      }
    } catch (e) {
      console.error("Failed to fetch reviews", e);
    } finally {
      setReviewLoading(false);
    }
  };

  const fetchSellerReviews = async (page = 1) => {
    try {
      setReviewLoading(true);
      const resp = await apiGet(`/reviews/seller/all?page=${page}`);
      if (resp.status === 'success') {
        setSellerReviews(resp.data.reviews);
        setSellerReviewPage(resp.data.page);
        setSellerReviewTotalPages(resp.data.totalPages);
      }
    } catch (e) {
      console.error("Failed to fetch seller reviews", e);
    } finally {
      setReviewLoading(false);
    }
  };

  const submitReview = async () => {
    if (!selectedProduct) return;
    if (newReview.text.length < 10) {
      setError("Review must be at least 10 characters long.");
      return;
    }
    if (newReview.text.length > 500) {
      setError("Review must be no more than 500 characters long.");
      return;
    }

    try {
      setReviewLoading(true);
      
      // Upload photos if any
      const photoUrls = [];
      if (newReview.photos && newReview.photos.length > 0) {
        for (const photo of newReview.photos) {
          photoUrls.push(photo);
        }
      }

      // Check if user already has a review for this product
      const userReview = reviews.find(r => r.customer_id === user?.id);
      
      let resp;
      if (userReview) {
        resp = await apiPut(`/reviews/${selectedProduct.id}`, {
          rating: newReview.rating,
          title: newReview.title,
          review_text: newReview.text,
          photos: photoUrls
        });
      } else {
        resp = await apiPost(`/reviews/${selectedProduct.id}`, {
          rating: newReview.rating,
          title: newReview.title,
          review_text: newReview.text,
          photos: photoUrls
        });
      }

      if (resp.status === 'success') {
        notify(userReview ? "Review updated successfully!" : "Review submitted successfully!", 'success');
        setNewReview({ rating: 5, title: "", text: "", photos: [] });
        // Refresh reviews and product details (to get updated stats)
        fetchReviews(selectedProduct.id);
        const prodResp = await apiGet(`/product/${selectedProduct.id}`);
        if (prodResp.status === 'success') {
          setSelectedProduct(prodResp.data);
        }
      }
    } catch (e) {
      setError(e.message || "Failed to submit review");
    } finally {
      setReviewLoading(false);
    }
  };

  const deleteReview = async (productId) => {
    if (!window.confirm("Are you sure you want to delete your review?")) return;
    try {
      setReviewLoading(true);
      const resp = await apiDelete(`/reviews/${productId}`);
      if (resp.status === 'success') {
        notify("Review deleted successfully!", 'success');
        fetchReviews(productId);
        const prodResp = await apiGet(`/product/${productId}`);
        if (prodResp.status === 'success') {
          setSelectedProduct(prodResp.data);
        }
      }
    } catch (e) {
      setError(e.message || "Failed to delete review");
    } finally {
      setReviewLoading(false);
    }
  };

  const handlePhotoUpload = (e) => {
    const files = Array.from(e.target.files);
    if (files.length + newReview.photos.length > 5) {
      setError("You can only upload up to 5 photos.");
      return;
    }

    files.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewReview(prev => ({
          ...prev,
          photos: [...prev.photos, reader.result]
        }));
      };
      reader.readAsDataURL(file);
    });
  };

  const removePhoto = (index) => {
    setNewReview(prev => ({
      ...prev,
      photos: prev.photos.filter((_, i) => i !== index)
    }));
  };

  const markReviewHelpful = async (reviewId) => {
    const storageKey = `helpful_${reviewId}`;
    if (localStorage.getItem(storageKey)) {
      notify("You already marked this review as helpful.", 'info');
      return;
    }

    try {
      const resp = await apiPost(`/reviews/${reviewId}/helpful`);
      if (resp.status === 'success') {
        localStorage.setItem(storageKey, 'true');
        setReviews(prev => prev.map(r => 
          r.id === reviewId ? { ...r, feedback: [{ ...r.feedback[0], helpful_count: (r.feedback[0]?.helpful_count || 0) + 1 }] } : r
        ));
        notify("Review marked as helpful. Thanks!", 'success');
      }
    } catch (e) {
      console.error("Failed to mark helpful", e);
    }
  };

  const reportReview = async (reviewId) => {
    const storageKey = `reported_${reviewId}`;
    if (localStorage.getItem(storageKey)) {
      notify("You have already reported this review.", 'info');
      return;
    }

    if (!window.confirm("Are you sure you want to report this review for community guideline violations?")) return;
    
    try {
      const resp = await apiPost(`/reviews/${reviewId}/report`);
      if (resp.status === 'success') {
        localStorage.setItem(storageKey, 'true');
        notify("Review reported. Our moderators will review it shortly.", 'success');
      }
    } catch (e) {
      console.error("Failed to report review", e);
      setError("Failed to report review. Please try again later.");
    }
  };

  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isImageLoading, setIsImageLoading] = useState(true);
  const thumbnailScrollRef = useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeftPos, setScrollLeftPos] = useState(0);

  const checkScroll = () => {
    if (thumbnailScrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = thumbnailScrollRef.current;
      setCanScrollLeft(scrollLeft > 0);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 1);
    }
  };

  const scrollGallery = (direction) => {
    if (thumbnailScrollRef.current) {
      const scrollAmount = 200;
      thumbnailScrollRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
      setTimeout(checkScroll, 350);
    }
  };

  const handleMouseDown = (e) => {
    setIsDragging(true);
    setStartX(e.pageX - thumbnailScrollRef.current.offsetLeft);
    setScrollLeftPos(thumbnailScrollRef.current.scrollLeft);
  };

  const handleMouseLeave = () => {
    setIsDragging(false);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    e.preventDefault();
    const x = e.pageX - thumbnailScrollRef.current.offsetLeft;
    const walk = (x - startX) * 2;
    thumbnailScrollRef.current.scrollLeft = scrollLeftPos - walk;
    checkScroll();
  };

  const handleTouchStart = (e) => {
    setIsDragging(true);
    setStartX(e.touches[0].pageX - thumbnailScrollRef.current.offsetLeft);
    setScrollLeftPos(thumbnailScrollRef.current.scrollLeft);
  };

  const handleTouchMove = (e) => {
    if (!isDragging) return;
    const x = e.touches[0].pageX - thumbnailScrollRef.current.offsetLeft;
    const walk = (x - startX) * 2;
    thumbnailScrollRef.current.scrollLeft = scrollLeftPos - walk;
    checkScroll();
  };

  useEffect(() => {
     if (view === "product-details" && selectedProduct) {
       setTimeout(checkScroll, 500);
       window.addEventListener('resize', checkScroll);
       return () => window.removeEventListener('resize', checkScroll);
     }
   }, [view, selectedProduct]);

  const nextImage = (imagesCount) => {
    setIsImageLoading(true);
    setCurrentImageIndex(prev => (prev + 1) % imagesCount);
  };

  const prevImage = (imagesCount) => {
    setIsImageLoading(true);
    setCurrentImageIndex(prev => (prev - 1 + imagesCount) % imagesCount);
  };

  const openProductDetails = async (product) => {
    if (!product) {
      setError("Product data is missing!");
      return;
    }
    
    setCurrentImageIndex(0); // Reset gallery index
    setIsImageLoading(true); // Set loading for new image

    // Check cache first
    if (productCache[product.id]) {
      setSelectedProduct(productCache[product.id]);
      setView("product-details");
      // Reset review form and sort
      setNewReview({ rating: 5, title: "", text: "", photos: [] });
      setReviewSort("newest");
      fetchReviews(product.id, 1, "newest");
      return;
    }

    try {
      setLoading(true);
      // Always fetch fresh details to ensure we have description, brand, etc.
      const resp = await apiGet(`/product/${product.id}`);
      if (resp.status === 'success') {
        const fullProduct = resp.data.product || resp.data;
        setSelectedProduct(fullProduct);
        // Update cache
        setProductCache(prev => ({ ...prev, [product.id]: fullProduct }));
      } else {
        setSelectedProduct(product);
      }
      
      setView("product-details");
      setIsProductModalOpen(false); // Close modal if open, as we are switching to full view
      setSelectedVariant(null);
      setIsZoomed(false);
      // Reset review form and sort
      setNewReview({ rating: 5, title: "", text: "", photos: [] });
      setReviewSort("newest");
      fetchReviews(product.id, 1, "newest");
    } catch (e) {
      console.error("Error opening product details:", e);
      setError("Failed to load product details. Showing available info.");
      // Fallback to what we have
      setSelectedProduct(product);
      setView("product-details");
      setIsProductModalOpen(false);
      setSelectedVariant(null);
      setIsZoomed(false);
      setReviewSort("newest");
      fetchReviews(product.id, 1, "newest");
    } finally {
      setLoading(false);
    }
  };

  const toggleCategory = (catId) => {
    setActiveFilters(prev => ({
      ...prev,
      categories: prev.categories.includes(catId)
        ? prev.categories.filter(id => id !== catId)
        : [...prev.categories, catId]
    }));
  };

  const toggleExpand = (catId) => {
    setExpandedCategories(prev => ({
      ...prev,
      [catId]: !prev[catId]
    }));
  };

  const renderCategory = (cat, depth = 0) => {
    const hasChildren = cat.children && cat.children.length > 0;
    const isExpanded = expandedCategories[cat.id];
    const isSelected = activeFilters.categories.includes(cat.id);

    return (
      <div key={cat.id} className="category-item" style={{ marginLeft: depth * 15 }}>
        <div className="flex align-center gap-8">
          {hasChildren && (
            <button 
              onClick={() => toggleExpand(cat.id)}
              className="category-toggle-btn"
            >
              {isExpanded ? '▼' : '▶'}
            </button>
          )}
          {!hasChildren && <div className="category-spacer" />}
          <label className="category-label">
            <input 
              type="checkbox" 
              checked={isSelected}
              onChange={() => toggleCategory(cat.id)}
            />
            {cat.name}
          </label>
        </div>
        {hasChildren && isExpanded && (
          <div className="subcategory-list">
            {cat.children.map(child => renderCategory(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  const flattenCategories = (cats, depth = 0) => {
    let flat = [];
    cats.forEach(cat => {
      flat.push({ ...cat, depth });
      if (cat.children && cat.children.length > 0) {
        flat = [...flat, ...flattenCategories(cat.children, depth + 1)];
      }
    });
    return flat;
  };

  const flattenedCategories = flattenCategories(filterMetadata.categories);

  // helpers
  const isAdmin = () => role === "admin";
  const isSeller = () => role === "seller";
  const fetchProductDetails = async (id) => {
    try {
      setLoading(true);
      const resp = await apiGet(`/product/${id}`);
      setSelectedProduct(resp.data);
      setIsProductModalOpen(true);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const isCustomer = () => role === "customer";

  const toggleWishlist = (product) => {
    if (!product) return;
    setWishlist(prev => {
      const exists = prev.find(p => p.id === product.id);
      if (exists) {
        notify("Removed from wishlist", 'success');
        return prev.filter(p => p.id !== product.id);
      } else {
        notify("Added to wishlist", 'success');
        return [...prev, product];
      }
    });
  };

  const [adminTab, setAdminTab] = useState("sellers"); // "sellers", "categories", "users"

  useEffect(() => {
    if (isAdmin() && view === "home" && adminTab === "users") {
      fetchAdminUsers();
    }
  }, [view, adminTab]);

  const fetchAdminUsers = async () => {
    try {
      setLoading(true);
      const resp = await apiGet("/admin/users");
      // Fallback to empty array if endpoint doesn't exist yet
      setAdminUsers(Array.isArray(resp) ? resp : (resp?.data || []));
    } catch (e) {
      console.error("Failed to fetch users", e);
      // For demo purposes, if API fails, we show a mock list
      if (process.env.NODE_ENV !== 'production') {
         setAdminUsers([
           { id: 1, name: "Admin User", email: "admin@veloceeo.com", role: "admin", created_at: new Date().toISOString() },
           { id: 2, name: "Sample Seller", email: "seller@test.com", role: "seller", created_at: new Date().toISOString() },
           { id: 3, name: "Demo Customer", email: "customer@demo.com", role: "customer", created_at: new Date().toISOString() }
         ]);
      }
    } finally {
      setLoading(false);
    }
  };

  const addCategory = async () => {
    if (!categoryForm.name) {
      notify("Category name is required", "error");
      return;
    }
    try {
      setLoading(true);
      const resp = await apiPost("/product/categories", {
        name: categoryForm.name,
        parentId: categoryForm.parentId ? parseInt(categoryForm.parentId) : null
      });
      if (resp.status === 'success') {
        notify("Category created successfully", "success");
        setCategoryForm({ name: "", parentId: "" });
        // Refresh filter metadata to update category list
        const filtersResp = await apiGet('/product/filters');
        if (filtersResp.status === 'success') setFilterMetadata(filtersResp.data);
      }
    } catch (e) {
      notify(e.message || "Failed to create category", "error");
    } finally {
      setLoading(false);
    }
  };

  const deleteCategory = async (id) => {
    if (!window.confirm("Are you sure? This will delete the category and potentially affect linked products.")) return;
    try {
      setLoading(true);
      const resp = await apiDelete(`/product/categories/${id}`);
      if (resp.status === 'success') {
        notify("Category deleted", "success");
        const filtersResp = await apiGet('/product/filters');
        if (filtersResp.status === 'success') setFilterMetadata(filtersResp.data);
      }
    } catch (e) {
      notify(e.message || "Failed to delete category", "error");
    } finally {
      setLoading(false);
    }
  };

  const deleteUser = async (id, userRole) => {
    if (!window.confirm(`Are you sure you want to delete this ${userRole}?`)) return;
    try {
      setLoading(true);
      // Use unified admin users endpoint with role in query
      await apiDelete(`/admin/users/${id}?role=${userRole}`);
      notify("User deleted successfully", "success");
      fetchAdminUsers();
    } catch (e) {
      notify(e.message || "Failed to delete user", "error");
    } finally {
      setLoading(false);
    }
  };

  const updateUser = async (id, role, data) => {
    try {
      setLoading(true);
      // Use unified admin users endpoint with role in body
      const resp = await apiPatch(`/admin/users/${id}`, { ...data, role });
      if (resp.status === 'success') {
        notify("User updated successfully", "success");
        setEditingUser(null);
        fetchAdminUsers();
      }
    } catch (e) {
      notify(e.message || "Failed to update user", "error");
    } finally {
      setLoading(false);
    }
  };

  const renderAdminDashboard = () => (
    <div className="admin-dashboard">
      <div className="admin-tabs">
        <button className={`btn ${adminTab === 'sellers' ? 'btn-primary' : ''}`} onClick={() => setAdminTab('sellers')}>Manage Sellers</button>
        <button className={`btn ${adminTab === 'categories' ? 'btn-primary' : ''}`} onClick={() => setAdminTab('categories')}>Manage Categories</button>
        <button className={`btn ${adminTab === 'users' ? 'btn-primary' : ''}`} onClick={() => setAdminTab('users')}>Manage Users</button>
      </div>

      {adminTab === 'sellers' && (
        <div className="grid-2 gap-24 mobile-grid-1">
          <div className="card">
            <div className="flex-between mb-12">
              <h2 className="m-0">Create Seller</h2>
              {sellerForm.name.includes("(Copy)") && (
                <span className="badge warning">Copy Mode</span>
              )}
            </div>
            <p className="muted mb-24">Only Admin can create seller profiles and share Seller IDs with sellers.</p>
            
            <div className="form-group mb-24">
              <div className="input-group">
                <label className="label">Business Details</label>
                <input className="input mb-12" placeholder="Business Name" value={sellerForm.name} onChange={(e) => setSellerForm({ ...sellerForm, name: e.target.value })} />
                <input className="input mb-12" placeholder="Email (must be unique)" type="email" value={sellerForm.email} onChange={(e) => setSellerForm({ ...sellerForm, email: e.target.value })} />
                <input className="input mb-12" placeholder="Password" type="password" value={sellerForm.password} onChange={(e) => setSellerForm({ ...sellerForm, password: e.target.value })} />
              </div>

              <div className="input-group mt-12">
                <label className="label">Contact & Location</label>
                <input className="input mb-12" placeholder="Phone" value={sellerForm.phone} onChange={(e) => setSellerForm({ ...sellerForm, phone: e.target.value })} />
                <input className="input mb-12" placeholder="Pincode" value={sellerForm.pincode} onChange={(e) => setSellerForm({ ...sellerForm, pincode: e.target.value })} />
                <input className="input" placeholder="Address" value={sellerForm.address} onChange={(e) => setSellerForm({ ...sellerForm, address: e.target.value })} />
              </div>
            </div>

            <div className="flex gap-12 mobile-stack">
              <button className="btn-primary" onClick={() => addSeller(sellerForm)}>Create New Seller</button>
              {(sellerForm.name || sellerForm.email) && (
                <button className="btn" onClick={() => setSellerForm({ name: "", email: "", password: "", phone: "", pincode: "", address: "" })}>Clear</button>
              )}
            </div>
          </div>

          <div className="card">
            <div className="flex-between mb-12">
              <h2 className="m-0">Sellers</h2>
              <button className="btn small" onClick={async () => {
                setLoading(true);
                try {
                  const list = await apiGet("/admin/sellers");
                  setSellers(list);
                } catch (e) {
                  setError("Failed to refresh sellers list");
                } finally {
                  setLoading(false);
                }
              }}>Refresh</button>
            </div>
            <ul className="list">
              {sellers.map((s) => (
                <li key={s.id} className="list-item">
                  <div>
                    <div className="seller-name bold">{s.name}</div>
                    <div className="muted small">{s.phone} • {s.pincode}</div>
                    <div className="muted tiny">ID: <code>{s.id}</code></div>
                  </div>
                  <div className="flex gap-8 mobile-actions-grid">
                    <button className="btn small" onClick={() => {
                      setSellerForm({
                        name: `${s.business_name || s.name} (Copy)`,
                        email: "",
                        password: "",
                        phone: s.phone || "",
                        pincode: s.pincode || "",
                        address: s.address || ""
                      });
                      notify("Seller data copied to the form above. Please enter a NEW email and password to create a unique seller.", "info");
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}>Copy Data</button>
                    <button
                      className="btn small"
                      onClick={() => {
                        setUserSellerId(s.id);
                        setView("seller-dashboard");
                      }}
                    >
                      Manage
                    </button>
                    <button className="btn-danger small" onClick={() => deleteSeller(s.id)}>Delete</button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {adminTab === 'categories' && (
        <div className="card">
          <div className="flex-between mb-16">
            <h2 className="m-0">Category Management</h2>
            <div className="muted small">Categories help customers find products easily.</div>
          </div>
          <div className="grid-2 gap-24 mobile-grid-1">
            <div className="border p-16 rounded">
              <h3 className="mb-12">Add New Category</h3>
              <div className="form-group">
                <label className="label">Category Name</label>
                <input 
                  className="input mb-12" 
                  placeholder="e.g. Electronics, Fashion" 
                  value={categoryForm.name}
                  onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                />
                <label className="label">Parent Category (Optional)</label>
                <select 
                  className="input mb-12"
                  value={categoryForm.parentId}
                  onChange={(e) => setCategoryForm({ ...categoryForm, parentId: e.target.value })}
                >
                  <option value="">None (Top Level)</option>
                  {flattenedCategories.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
                <button className="btn-primary w-full" onClick={addCategory}>Create Category</button>
              </div>
            </div>
            <div className="border p-16 rounded">
              <h3 className="mb-12">Current Categories</h3>
              <div className="filter-scroll-area h-400">
                <ul className="list">
                  {flattenedCategories.length > 0 ? flattenedCategories.map(c => (
                    <li key={c.id} className="list-item">
                      <div className="flex align-center gap-8">
                        {c.depth > 0 && <span className="muted">{'—'.repeat(c.depth)}</span>}
                        <div className="bold">{c.name}</div>
                      </div>
                      <div className="flex gap-8 mobile-actions-grid">
                        <button className="btn small" onClick={() => {
                          const newName = window.prompt("Enter new category name:", c.name);
                          if (newName && newName !== c.name) {
                            apiPatch(`/product/categories/${c.id}`, { name: newName })
                              .then(() => {
                                notify("Category updated", "success");
                                return apiGet('/product/filters');
                              })
                              .then(resp => {
                                if (resp.status === 'success') setFilterMetadata(resp.data);
                              });
                          }
                        }}>Edit</button>
                        <button className="btn-danger small" onClick={() => deleteCategory(c.id)}>Delete</button>
                      </div>
                    </li>
                  )) : (
                    <div className="muted p-12 text-center">No categories found.</div>
                  )}
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {adminTab === 'users' && (
        <div className="card">
          <div className="flex-between mb-16">
            <h2 className="m-0">User Management</h2>
            <button className="btn small" onClick={fetchAdminUsers}>Refresh List</button>
          </div>
          
          <div className="table-container">
            <table className="table responsive-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Joined</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {adminUsers.length > 0 ? adminUsers.map(u => (
                  <tr key={`${u.role}-${u.id}`}>
                    <td data-label="Name">
                      <div className="bold">{u.name || "N/A"}</div>
                      <div className="muted tiny">ID: {u.id}</div>
                    </td>
                    <td data-label="Email">{u.email}</td>
                    <td data-label="Role">
                      <span className={`badge ${u.role === 'admin' ? 'danger' : u.role === 'seller' ? 'primary' : 'success'}`}>
                        {u.role.toUpperCase()}
                      </span>
                    </td>
                    <td data-label="Joined">{u.created_at ? new Date(u.created_at).toLocaleDateString() : 'N/A'}</td>
                    <td data-label="Actions">
                      <div className="flex gap-8 mobile-actions">
                        <button className="btn small" onClick={() => setEditingUser({ ...u })}>Edit</button>
                        <button 
                          className="btn-danger small" 
                          disabled={u.email === user?.email}
                          onClick={() => deleteUser(u.id, u.role)}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan="5" className="text-center py-24 muted">No users found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {editingUser && (
        <div className="modal-overlay" onClick={() => setEditingUser(null)}>
          <div className="modal-container p-24" onClick={e => e.stopPropagation()}>
            <div className="flex-between mb-16">
              <h2 className="m-0">Edit {editingUser.role.toUpperCase()}</h2>
              <button className="close-btn" onClick={() => setEditingUser(null)}>×</button>
            </div>
            <div className="form-group">
              <label className="label">Name</label>
              <input 
                className="input mb-12" 
                value={editingUser.name || ""} 
                onChange={e => setEditingUser({ ...editingUser, name: e.target.value })}
              />
              <label className="label">Email</label>
              <input 
                className="input mb-12" 
                value={editingUser.email || ""} 
                onChange={e => setEditingUser({ ...editingUser, email: e.target.value })}
              />
              {editingUser.role === 'seller' && (
                <>
                  <label className="label">Phone</label>
                  <input 
                    className="input mb-12" 
                    value={editingUser.phone || ""} 
                    onChange={e => setEditingUser({ ...editingUser, phone: e.target.value })}
                  />
                  <label className="label">Address</label>
                  <input 
                    className="input mb-12" 
                    value={editingUser.address || ""} 
                    onChange={e => setEditingUser({ ...editingUser, address: e.target.value })}
                  />
                </>
              )}
              <div className="flex gap-12 mt-16 mobile-stack">
                <button 
                  className="btn-primary flex-1" 
                  onClick={() => updateUser(editingUser.id, editingUser.role, editingUser)}
                >
                  Save Changes
                </button>
                <button className="btn flex-1" onClick={() => setEditingUser(null)}>Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
  const renderProductDetails = () => {
    if (loading) return (
      <div className="card text-center py-24">
        <span className="spinner spinner-large spinner-rust"></span>
        <p className="muted mt-8">Loading product details...</p>
      </div>
    );

    if (error) return (
      <div className="card text-center py-24">
        <div className="text-danger text-3xl mb-16">⚠</div>
        <h3 className="text-danger">Oops! Something went wrong</h3>
        <p className="muted mb-16">{error}</p>
        <button className="btn" onClick={() => setView("catalog")}>Back to Catalog</button>
      </div>
    );

    if (!selectedProduct) return (
      <div className="card text-center py-24">
        <p className="muted">No product selected.</p>
        <button className="btn" onClick={() => setView("catalog")}>Back to Catalog</button>
      </div>
    );

    const safeAvgRating = Math.round(selectedProduct.avg_rating || 0);
    const starString = "★".repeat(Math.max(0, Math.min(5, safeAvgRating))) + "☆".repeat(Math.max(0, Math.min(5, 5 - safeAvgRating)));

    const ratingBreakdown = {
      5: selectedProduct.rating_5 || 0,
      4: selectedProduct.rating_4 || 0,
      3: selectedProduct.rating_3 || 0,
      2: selectedProduct.rating_2 || 0,
      1: selectedProduct.rating_1 || 0,
    };
    const totalReviewCount = selectedProduct.review_count || 0;

    const relatedProducts = products
      .filter(p => p.id !== selectedProduct.id && 
        (p.category?.id === (selectedProduct.category?.id || selectedProduct.category) || 
         p.category === selectedProduct.category))
      .slice(0, 6);

    const productImages = (selectedProduct.images?.length > 0) 
      ? selectedProduct.images.map(img => img.url)
      : [selectedProduct.image || "/logo_veloceeo.jpg"];

    return (
      <div className="product-details-view fade-in">
        <div className="flex-between mb-16 align-center">
          <div className="flex align-center gap-12">
            <button className="btn btn-outline btn-small" onClick={() => {
              if (openStoreId) setView("catalog");
              else if (isSeller()) setView("seller-dashboard");
              else setView("catalog");
            }}>← Back</button>
            <div>
              <h2 className="m-0">Product Details</h2>
              <p className="muted tiny">{selectedProduct.brand || "Veloceeo Essentials"}</p>
            </div>
          </div>
          
          <div className="flex gap-12">
            <button className="btn btn-outline btn-small" onClick={() => toggleWishlist(selectedProduct)}>
              {wishlist.some(p => p.id === selectedProduct.id) ? "❤️ Wishlisted" : "🤍 Add to Wishlist"}
            </button>
          </div>
        </div>
        
        <div className="product-details-card">
          <div className="product-gallery">
            <div className="gallery-main">
              {isImageLoading && (
                <div className="image-loading-overlay">
                  <span className="spinner spinner-rust"></span>
                </div>
              )}
              <img 
                src={productImages[currentImageIndex]} 
                alt={selectedProduct.name} 
                className={`gallery-image ${isImageLoading ? 'loading' : 'loaded'}`}
                onLoad={() => setIsImageLoading(false)}
                onError={(e) => { 
                  e.target.src = "/logo_veloceeo.jpg"; 
                  setIsImageLoading(false);
                }}
              />
              
              {productImages.length > 1 && (
                <>
                  <button className="gallery-nav-btn prev" onClick={() => prevImage(productImages.length)} aria-label="Previous image">‹</button>
                  <button className="gallery-nav-btn next" onClick={() => nextImage(productImages.length)} aria-label="Next image">›</button>
                </>
              )}
            </div>

            {productImages.length > 1 && (
              <div className="thumbnail-gallery-wrapper">
                <button 
                  className="gallery-scroll-btn left" 
                  onClick={() => scrollGallery('left')}
                  disabled={!canScrollLeft}
                  aria-label="Scroll gallery left"
                >
                  ‹
                </button>

                <div 
                  className="thumbnail-gallery" 
                  ref={thumbnailScrollRef}
                  onScroll={checkScroll}
                  onMouseDown={handleMouseDown}
                  onMouseLeave={handleMouseLeave}
                  onMouseUp={handleMouseUp}
                  onMouseMove={handleMouseMove}
                  onTouchStart={handleTouchStart}
                  onTouchMove={handleTouchMove}
                  onTouchEnd={handleMouseUp}
                  style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
                >
                  {productImages.map((img, idx) => (
                    <div 
                      key={idx} 
                      className={`thumbnail-item ${currentImageIndex === idx ? 'active' : ''}`}
                      onClick={() => setCurrentImageIndex(idx)}
                    >
                      <img 
                        src={img} 
                        alt={`${selectedProduct.name} thumbnail ${idx + 1}`} 
                        onError={(e) => { e.target.src = "/logo_veloceeo.jpg"; }}
                      />
                    </div>
                  ))}
                </div>

                <button 
                  className="gallery-scroll-btn right" 
                  onClick={() => scrollGallery('right')}
                  disabled={!canScrollRight}
                  aria-label="Scroll gallery right"
                >
                  ›
                </button>
              </div>
            )}
          </div>
          
          <div className="product-info-panel">
            <div className="brand-badge">
              {selectedProduct.brand || "Veloceeo Essentials"}
            </div>
            <h1 className="product-title">{selectedProduct.name}</h1>
            
            <div className="rating-summary-row">
              <div className="stars">
                {starString}
              </div>
              <span className="rating-score">
                {(selectedProduct.avg_rating || 0).toFixed(1)}
              </span>
              <span className="review-count">
                ({totalReviewCount} Reviews)
              </span>
            </div>
            
            <div className="price-display">
              <span className="current-price">₹{(selectedProduct.price_cents ? (selectedProduct.price_cents / 100) : (selectedProduct.price || 0)).toLocaleString('en-IN')}</span>
              <span className="original-price">
                ₹{((selectedProduct.price_cents ? (selectedProduct.price_cents / 100) : (selectedProduct.price || 0)) * 1.2).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
              </span>
              <span className="discount-badge">20% OFF</span>
            </div>
            
            <div className="stock-status">
              {selectedProduct.stock_quantity > 0 ? (
                <div className="stock-in">
                  <span className="pulse-dot"></span>
                  In Stock ({selectedProduct.stock_quantity} available)
                </div>
              ) : (
                <div className="stock-out">Out of Stock</div>
              )}
            </div>

            <div className="details-section">
              <h4 className="section-label">Product Description</h4>
              <p className="description-text">
                {selectedProduct.description || "Experience the premium quality of Veloceeo products. This item is carefully crafted to meet our high standards of durability and performance, ensuring you get the best value for your purchase."}
              </p>
            </div>
            
            <div className="spec-grid-container">
              <h4 className="section-label">Key Specifications</h4>
              <div className="spec-grid">
                <div className="spec-item">
                  <span className="spec-label">SKU</span>
                  <span className="spec-value">{selectedProduct.sku || 'N/A'}</span>
                </div>
                <div className="spec-item">
                  <span className="spec-label">Category</span>
                  <span className="spec-value">{selectedProduct.category?.name || selectedProduct.category || 'General'}</span>
                </div>
                {selectedProduct.brand && (
                  <div className="spec-item">
                    <span className="spec-label">Brand</span>
                    <span className="spec-value">{selectedProduct.brand}</span>
                  </div>
                )}
                <div className="spec-item">
                  <span className="spec-label">Quality Check</span>
                  <span className="spec-value verified">✓ Verified</span>
                </div>
              </div>
            </div>
            
            <div className="purchase-actions">
              <div className="quantity-control">
                <button 
                  className="qty-btn" 
                  onClick={() => {
                    const input = document.getElementById(`qty-details-${selectedProduct.id}`);
                    if (input.value > 1) input.value = parseInt(input.value) - 1;
                  }}
                >-</button>
                <input 
                  type="number" 
                  min="1" 
                  defaultValue="1" 
                  className="qty-input"
                  id={`qty-details-${selectedProduct.id || selectedProduct.product?.id}`}
                />
                <button 
                  className="qty-btn" 
                  onClick={() => {
                    const input = document.getElementById(`qty-details-${selectedProduct.id || selectedProduct.product?.id}`);
                    input.value = parseInt(input.value) + 1;
                  }}
                >+</button>
              </div>
              <button 
                className="btn-primary btn-large flex-1" 
                disabled={(selectedProduct.stock_quantity || selectedProduct.product?.stock_quantity) <= 0 || loading}
                onClick={() => {
                  const q = document.getElementById(`qty-details-${selectedProduct.id || selectedProduct.product?.id}`).value;
                  addToCart(selectedProduct.id ? selectedProduct : selectedProduct.product, parseInt(q) || 1);
                }}
              >
                {loading ? <span className="spinner"></span> : <>🛒 Add to Cart</>}
              </button>
            </div>
          </div>
        </div>

        {relatedProducts.length > 0 && (
          <div className="related-products-section mt-48">
            <h2 className="section-title mb-24">Related Products</h2>
            <div className="related-products-grid-wrapper">
              <div className="related-products-grid">
                {relatedProducts.map(p => (
                  <div key={p.id} className="related-product-card" onClick={() => openProductDetails(p)}>
                    <div className="related-image-wrapper">
                      <img 
                        src={p.images?.[0]?.url || p.image || "/logo_veloceeo.jpg"} 
                        alt={p.name} 
                        onError={(e) => { e.target.src = "/logo_veloceeo.jpg"; }}
                      />
                    </div>
                    <div className="related-info">
                      <h3 className="related-name">{p.name}</h3>
                      <p className="related-price">₹{(p.price_cents ? (p.price_cents / 100) : (p.price || 0)).toLocaleString('en-IN')}</p>
                      <button 
                        className="btn btn-outline btn-tiny mt-8" 
                        onClick={(e) => { 
                          e.stopPropagation(); 
                          openProductDetails(p); 
                        }}
                      >
                        Quick View
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        <div ref={reviewsRef} className="reviews-section">
          <div className="reviews-header-row">
            <h2 className="section-title">Customer Reviews</h2>
            <div className="rating-badge-large">
               <span className="score">{(selectedProduct.avg_rating || 0).toFixed(1)}</span>
               <div className="stars-large">{starString}</div>
               <span className="count">Based on {totalReviewCount} reviews</span>
            </div>
          </div>
          
          <div className="reviews-layout">
            <div className="review-sidebar">
              {/* Rating Distribution */}
              <div className="card review-stats-card">
                <h3 className="card-title">Rating Breakdown</h3>
                <div className="rating-distribution">
                  {[5, 4, 3, 2, 1].map(star => {
                    const count = ratingBreakdown[star] || 0;
                    const percentage = totalReviewCount > 0 ? (count / totalReviewCount) * 100 : 0;
                    return (
                      <div key={star} className="dist-row">
                        <span className="star-num">{star} ★</span>
                        <div className="dist-bar"><div className="dist-fill" style={{ width: `${percentage}%` }}></div></div>
                        <span className="dist-count">{count}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {isCustomer() ? (
                <div className="card write-review-card sticky-card">
                  <h3 className="card-title">{reviews.some(r => r.customer_id === user?.id) ? "Edit Your Review" : "Write a Review"}</h3>
                  <div className="form-group">
                    <label>Rating</label>
                    <div className="star-input">
                      {[1, 2, 3, 4, 5].map(s => (
                        <span key={s} onClick={() => setNewReview(prev => ({ ...prev, rating: s }))} className={s <= newReview.rating ? 'active' : ''}>★</span>
                      ))}
                    </div>
                  </div>
                  <div className="form-group">
                    <label>Review Title (optional)</label>
                    <input 
                      type="text"
                      className="input" 
                      placeholder="Headline for your review"
                      value={newReview.title}
                      onChange={(e) => setNewReview(prev => ({ ...prev, title: e.target.value }))}
                    />
                  </div>
                  <div className="form-group">
                    <label>Your Review</label>
                    <textarea 
                      className="textarea-input" 
                      placeholder="What did you like or dislike?"
                      value={newReview.text}
                      onChange={(e) => setNewReview(prev => ({ ...prev, text: e.target.value }))}
                    />
                    <p className={`input-hint ${newReview.text.length < 10 || newReview.text.length > 500 ? 'error' : ''}`}>
                      {newReview.text.length}/500 chars (min 10)
                    </p>
                  </div>

                  <div className="form-group">
                    <label>Add Photos (max 5)</label>
                    <div className="photo-upload-grid">
                      {newReview.photos.map((photo, index) => (
                        <div key={index} className="photo-preview">
                          <img src={photo} alt="Preview" />
                          <button 
                            onClick={() => removePhoto(index)}
                            className="remove-photo-btn"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                      {newReview.photos.length < 5 && (
                        <label className="photo-upload-btn">
                          +
                          <input type="file" accept="image/*" multiple onChange={handlePhotoUpload} className="hidden" />
                        </label>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-12 mt-16">
                    <button 
                      className="btn-primary flex-1 flex-center" 
                      disabled={reviewLoading || newReview.text.length < 10 || newReview.text.length > 500}
                      onClick={submitReview}
                    >
                      {reviewLoading ? <span className="spinner spinner-rust"></span> : (reviews.some(r => r.customer_id === user?.id) ? "Update Review" : "Submit Review")}
                    </button>
                    {reviews.some(r => r.customer_id === user?.id) && (
                      <button 
                        className="btn-outline danger"
                        disabled={reviewLoading}
                        onClick={() => deleteReview(selectedProduct.id)}
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <div className="card login-prompt-card">
                  <h3>Want to review?</h3>
                  <p className="muted small">Only customers who have purchased this product can leave a review.</p>
                </div>
              )}
            </div>

            <div className="reviews-list-container">
              <div className="reviews-filter-bar">
                <h3>Reviews</h3>
                <div className="sort-control">
                  <span className="muted small">Sort by:</span>
                  <select 
                    className="input small" 
                    value={reviewSort}
                    onChange={(e) => {
                      setReviewSort(e.target.value);
                      fetchReviews(selectedProduct.id, 1, e.target.value);
                    }}
                  >
                    <option value="newest">Newest</option>
                    <option value="highest">Highest Rating</option>
                    <option value="lowest">Lowest Rating</option>
                  </select>
                </div>
              </div>
              {reviewLoading && reviews.length === 0 ? (
                <div className="card text-center py-24">
                  <span className="spinner spinner-rust"></span>
                  <p className="muted mt-8">Loading reviews...</p>
                </div>
              ) : !Array.isArray(reviews) || reviews.length === 0 ? (
                <div className="empty-reviews-state">
                  <p className="muted">No reviews yet. Be the first to share your thoughts!</p>
                </div>
              ) : (
                <>
                  {reviews.map(review => (
                    <div key={review.id} className="review-card card">
                      <div className="review-header">
                        <div className="reviewer-info">
                          <div className="avatar-circle" style={{ background: `hsl(${review.customer?.name?.length * 40 || 0}, 70%, 80%)` }}>
                            {(review.customer?.name || "V").charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="reviewer-name">
                              {review.customer?.name || "Verified Customer"}
                              {review.order_id && <span className="verified-badge" title="Verified Purchase">✓ Verified Purchase</span>}
                            </div>
                            <div className="muted tiny">{new Date(review.created_at).toLocaleDateString()}</div>
                          </div>
                        </div>
                        <div className="review-stars">
                          {"★".repeat(Math.max(0, Math.min(5, review.rating))) + "☆".repeat(Math.max(0, Math.min(5, 5 - review.rating)))}
                        </div>
                      </div>
                      
                      {review.title && (
                        <h4 className="review-title">{review.title}</h4>
                      )}
                      
                      <p className="review-text">{review.review_text}</p>
                      
                      {review.photos && review.photos.length > 0 && (
                        <div className="review-photos-grid">
                          {review.photos.map((photo, i) => (
                            <img 
                              key={i} 
                              src={photo} 
                              alt={`Review photo ${i+1}`} 
                              onClick={() => window.open(photo, '_blank')}
                            />
                          ))}
                        </div>
                      )}

                      <div className="review-actions">
                        <button 
                          className="btn-link" 
                          onClick={() => markReviewHelpful(review.id)}
                        >
                          👍 Helpful ({review.feedback?.[0]?.helpful_count || 0})
                        </button>
                        {user?.id === review.customer_id ? (
                          <>
                            <button 
                              className="btn-link" 
                              onClick={() => {
                                reviewsRef.current?.scrollIntoView({ behavior: 'smooth' });
                              }}
                            >
                              ✎ Edit
                            </button>
                            <button 
                              className="btn-link danger" 
                              onClick={() => deleteReview(selectedProduct.id)}
                            >
                              🗑 Delete
                            </button>
                          </>
                        ) : (
                          <button 
                            className="btn-link danger" 
                            onClick={() => reportReview(review.id)}
                          >
                            🏳 Report
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                  
                  {reviewTotalPages > 1 && (
                    <div className="pagination">
                      {Array.from({ length: reviewTotalPages }).map((_, i) => (
                        <button 
                          key={i} 
                          className={`btn small ${reviewPage === i + 1 ? 'active' : ''}`}
                          onClick={() => fetchReviews(selectedProduct.id, i + 1, reviewSort)}
                        >
                          {i + 1}
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const endpoint = isCustomer() ? "/customer/me" : isSeller() ? "/seller/me" : "/admin/me";
      const resp = await apiPatch(endpoint, {
        name: profileForm.name,
        phone: profileForm.phone,
      });
      
      // Update local user state
      const updatedUser = resp.status === 'success' ? resp.data : (resp.user || resp.customer || resp.seller || resp.admin || resp);
      setUser({ ...user, ...updatedUser });
      
      notify("Profile updated successfully!", "success");
      setView("catalog");
    } catch (err) {
      setError(err.message || "Failed to update profile");
      notify("Update failed: " + (err.message || "Unknown error"), "error");
    } finally {
      setLoading(false);
    }
  };

  const renderEditProfile = () => (
    <div className="view-profile-edit fade-in">
      <div className="card max-w-600 mx-auto">
        <div className="flex-between mb-24">
          <h2 className="m-0">Edit Profile</h2>
          <button className="btn-close" onClick={() => setView("catalog")}>✕</button>
        </div>
        
        <form onSubmit={handleUpdateProfile}>
          <div className="form-group mb-16">
            <label className="label">Full Name</label>
            <input 
              className="input" 
              value={profileForm.name} 
              onChange={(e) => setProfileForm({...profileForm, name: e.target.value})}
              placeholder="Your full name"
              required
            />
          </div>
          <div className="form-group mb-16">
            <label className="label">Email Address</label>
            <input 
              className="input muted-input" 
              value={profileForm.email} 
              disabled 
              readOnly
            />
            <p className="muted tiny mt-4">Email cannot be changed.</p>
          </div>
          <div className="form-group mb-24">
            <label className="label">Phone Number</label>
            <input 
              className="input" 
              value={profileForm.phone} 
              onChange={(e) => setProfileForm({...profileForm, phone: e.target.value})}
              placeholder="e.g. +91 9876543210"
            />
          </div>
          <div className="flex gap-12">
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? "Saving..." : "Save Changes"}
            </button>
            <button type="button" className="btn-outline" onClick={() => setView("catalog")}>
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  const renderAccountSettings = () => (
    <div className="view-account-settings fade-in">
      <div className="card max-w-600 mx-auto">
        <div className="flex-between mb-24">
          <h2 className="m-0">Account Settings</h2>
          <button className="btn-close" onClick={() => setView("catalog")}>✕</button>
        </div>
        
        <div className="settings-section mb-32">
          <h3 className="mb-16">Security</h3>
          <p className="muted small mb-16">To change your password, we will send a reset link to your registered email address.</p>
          <button 
            className="btn-outline" 
            onClick={async () => {
              setLoading(true);
              try {
                await apiPost("/customer/forgot-password", { email: user.email });
                notify("Password reset link sent to your email!", "success");
              } catch (err) {
                notify("Failed to send reset link: " + err.message, "error");
              } finally {
                setLoading(false);
              }
            }}
            disabled={loading}
          >
            {loading ? "Sending..." : "Send Password Reset Link"}
          </button>
        </div>

        <div className="settings-section pt-24 border-top">
          <h3 className="mb-16 text-danger">Danger Zone</h3>
          <p className="muted small mb-16">Permanently delete your account and all associated data. This action cannot be undone.</p>
          <button 
            className="btn-outline-danger" 
            onClick={() => {
              if(confirm("Are you absolutely sure you want to delete your account? This action cannot be undone.")) {
                notify("Account deletion requested. Our support team will contact you shortly for verification.", "info");
              }
            }}
          >
            Delete Account
          </button>
        </div>

        <div className="mt-32 pt-16 border-top">
          <button className="btn-primary" onClick={() => setView("catalog")}>Back to Catalog</button>
        </div>
      </div>
    </div>
  );

  const renderProductModal = () => {
    if (!isProductModalOpen || !selectedProduct) return null;

    const safeAvgRating = Math.round(selectedProduct.avg_rating || 0);
    const starString = "★".repeat(Math.max(0, Math.min(5, safeAvgRating))) + "☆".repeat(Math.max(0, Math.min(5, 5 - safeAvgRating)));
    
    const ratingBreakdown = {
      5: selectedProduct.rating_5 || 0,
      4: selectedProduct.rating_4 || 0,
      3: selectedProduct.rating_3 || 0,
      2: selectedProduct.rating_2 || 0,
      1: selectedProduct.rating_1 || 0,
    };
    const totalReviewCount = selectedProduct.review_count || 0;
    
    const isInWishlist = wishlist.some(p => p.id === selectedProduct.id);

    const productImages = (selectedProduct.images?.length > 0) 
      ? selectedProduct.images.map(img => img.url)
      : [selectedProduct.image || "/logo_veloceeo.jpg"];

    return (
      <div className="modal-overlay" onClick={() => setIsProductModalOpen(false)}>
        <div className="modal-container" onClick={e => e.stopPropagation()}>
          <button className="modal-close-btn" onClick={() => setIsProductModalOpen(false)}>×</button>
          
          <div className="product-modal-content">
            <div className="product-details-grid">
              {/* Left Column: Image Gallery */}
              <div className="product-gallery">
                <div className="gallery-main">
                  {isImageLoading && (
                    <div className="image-loading-overlay">
                      <span className="spinner spinner-rust"></span>
                    </div>
                  )}
                  <img 
                    src={productImages[currentImageIndex]} 
                    alt={selectedProduct.name} 
                    className={`gallery-image ${isImageLoading ? 'loading' : 'loaded'}`}
                    onLoad={() => setIsImageLoading(false)}
                    onError={(e) => { 
                      e.target.src = "/logo_veloceeo.jpg"; 
                      setIsImageLoading(false);
                    }}
                  />
                  
                  {productImages.length > 1 && (
                    <>
                      <button className="gallery-nav-btn prev" onClick={() => prevImage(productImages.length)} aria-label="Previous image">‹</button>
                      <button className="gallery-nav-btn next" onClick={() => nextImage(productImages.length)} aria-label="Next image">›</button>
                    </>
                  )}
                </div>

                {productImages.length > 1 && (
                  <div className="thumbnail-gallery-wrapper">
                    <button 
                      className="gallery-scroll-btn left" 
                      onClick={() => scrollGallery('left')}
                      disabled={!canScrollLeft}
                      aria-label="Scroll gallery left"
                    >
                      ‹
                    </button>

                    <div 
                      className="thumbnail-gallery" 
                      ref={thumbnailScrollRef}
                      onScroll={checkScroll}
                      onMouseDown={handleMouseDown}
                      onMouseLeave={handleMouseLeave}
                      onMouseUp={handleMouseUp}
                      onMouseMove={handleMouseMove}
                      onTouchStart={handleTouchStart}
                      onTouchMove={handleTouchMove}
                      onTouchEnd={handleMouseUp}
                      style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
                    >
                      {productImages.map((img, idx) => (
                        <div 
                          key={idx} 
                          className={`thumbnail-item ${currentImageIndex === idx ? 'active' : ''}`}
                          onClick={() => setCurrentImageIndex(idx)}
                        >
                          <img 
                            src={img} 
                            alt={`${selectedProduct.name} thumbnail ${idx + 1}`} 
                            onError={(e) => { e.target.src = "/logo_veloceeo.jpg"; }}
                          />
                        </div>
                      ))}
                    </div>

                    <button 
                      className="gallery-scroll-btn right" 
                      onClick={() => scrollGallery('right')}
                      disabled={!canScrollRight}
                      aria-label="Scroll gallery right"
                    >
                      ›
                    </button>
                  </div>
                )}
              </div>
              
              {/* Right Column: Info & Actions */}
              <div className="product-details-info">
                <div className="brand-label">{selectedProduct.brand || "Veloceeo Essentials"}</div>
                <h1 className="product-modal-title">{selectedProduct.name}</h1>
                
                <div className="rating-summary flex items-center gap-12 mb-20">
                  <div className="stars text-warning text-lg">
                    {starString}
                  </div>
                  <span className="muted text-md">
                    {(selectedProduct.avg_rating || 0).toFixed(1)} ({totalReviewCount} reviews)
                  </span>
                </div>
                
                <div className="price-tag flex items-center gap-12 mb-24">
                  <span className="text-2xl bold text-dark">
                    ₹{(selectedProduct.price_cents ? (selectedProduct.price_cents / 100) : (selectedProduct.price || 0)).toLocaleString('en-IN')}
                  </span>
                  {selectedProduct.price_cents > 1000 && (
                    <span className="text-lg muted line-through">
                      ₹{Math.round((selectedProduct.price_cents * 1.2) / 100).toLocaleString('en-IN')}
                    </span>
                  )}
                  {selectedProduct.price_cents > 1000 && (
                    <span className="badge success-badge">20% OFF</span>
                  )}
                </div>
                
                <p className="description text-md text-muted mb-32 lh-1-6">
                  {selectedProduct.description || "A high-quality product from Veloceeo's curated selection. Designed for performance and durability."}
                </p>

                {/* Variants Selection */}
                <div className="variant-selector">
                  <h3 className="small-title">Select Color</h3>
                  <div className="variant-options">
                    {['Classic Brown', 'Midnight Black', 'Slate Grey'].map(color => (
                      <button 
                        key={color}
                        className={`variant-btn ${selectedVariant === color ? 'active' : ''}`}
                        onClick={() => setSelectedVariant(color)}
                      >
                        {color}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="variant-selector">
                  <h3 className="small-title">Select Size</h3>
                  <div className="variant-options">
                    {['S', 'M', 'L', 'XL'].map(size => (
                      <button 
                        key={size}
                        className={`variant-btn ${selectedVariant === size ? 'active' : ''}`}
                        onClick={() => setSelectedVariant(size)}
                      >
                        {size}
                      </button>
                    ))}
                  </div>
                </div>
                
                <div className="flex gap-12 items-center mb-24">
                  <div className="flex-column gap-4">
                    <label className="tiny muted">Quantity</label>
                    <input 
                      type="number" 
                      min="1" 
                      defaultValue="1" 
                      className="w-70 p-12 rounded border text-md"
                      id={`qty-modal-${selectedProduct.id}`}
                    />
                  </div>
                  <button 
                    className="btn-primary btn-xl flex-2 mt-16" 
                    disabled={selectedProduct.stock_quantity <= 0}
                    onClick={() => {
                      const q = document.getElementById(`qty-modal-${selectedProduct.id}`).value;
                      addToCart(selectedProduct, parseInt(q) || 1);
                    }}
                  >
                    {selectedProduct.stock_quantity > 0 ? "Add to Cart" : "Out of Stock"}
                  </button>
                  <button 
                    className={`btn-outline btn-icon-xl rounded border mt-16 ${isInWishlist ? 'active' : ''}`}
                    onClick={() => toggleWishlist(selectedProduct)}
                    title={isInWishlist ? "Remove from Wishlist" : "Add to Wishlist"}
                  >
                    {isInWishlist ? '❤️' : '🤍'}
                  </button>
                </div>

                {/* Shipping Info */}
                <div className="shipping-info">
                  <div className="shipping-item">
                    <span>🚚</span>
                    <div>
                      <strong>Free Delivery</strong>
                      <p className="tiny muted">Est. Delivery: {new Date(Date.now() + 3*24*60*60*1000).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <div className="shipping-item">
                    <span>🛡️</span>
                    <div>
                      <strong>1 Year Warranty</strong>
                      <p className="tiny muted">Veloceeo Genuine Product</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Reusing Review Section Logic */}
            <div ref={reviewsRef} className="reviews-section mt-12 pt-12 border-t">
              <div className="reviews-header-row">
                <h2 className="section-title">Customer Reviews</h2>
                <div className="rating-badge-large">
                   <span className="score">{(selectedProduct.avg_rating || 0).toFixed(1)}</span>
                   <div className="stars-large">{starString}</div>
                   <span className="count">Based on {totalReviewCount} reviews</span>
                </div>
              </div>
              
              <div className="reviews-layout">
                <div className="review-sidebar">
                  {/* Rating Distribution */}
                  <div className="card review-stats-card">
                    <h3 className="card-title">Rating Breakdown</h3>
                    <div className="rating-distribution">
                      {[5, 4, 3, 2, 1].map(star => {
                        const count = ratingBreakdown[star] || 0;
                        const percentage = totalReviewCount > 0 ? (count / totalReviewCount) * 100 : 0;
                        return (
                          <div key={star} className="dist-row">
                            <span className="star-num">{star} ★</span>
                            <div className="dist-bar"><div className="dist-fill" style={{ width: `${percentage}%` }}></div></div>
                            <span className="dist-count">{count}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {isCustomer() ? (
                    <div className="card write-review-card sticky-card">
                      <h3 className="card-title">{reviews.some(r => r.customer_id === user?.id) ? "Edit Your Review" : "Write a Review"}</h3>
                      <div className="form-group">
                        <label>Rating</label>
                        <div className="star-input">
                          {[1, 2, 3, 4, 5].map(s => (
                            <span key={s} onClick={() => setNewReview(prev => ({ ...prev, rating: s }))} className={s <= newReview.rating ? 'active' : ''}>★</span>
                          ))}
                        </div>
                      </div>
                      <div className="form-group">
                        <label>Review Title (optional)</label>
                        <input 
                          type="text"
                          className="input" 
                          placeholder="Headline for your review"
                          value={newReview.title}
                          onChange={(e) => setNewReview(prev => ({ ...prev, title: e.target.value }))}
                        />
                      </div>
                      <div className="form-group">
                        <label>Your Review</label>
                        <textarea 
                            className="textarea-input" 
                            placeholder="What did you like or dislike?"
                            value={newReview.text}
                            onChange={(e) => setNewReview(prev => ({ ...prev, text: e.target.value }))}
                          />
                        <p className={`input-hint ${newReview.text.length < 10 || newReview.text.length > 500 ? 'error' : ''}`}>
                          {newReview.text.length}/500 chars (min 10)
                        </p>
                      </div>

                      <div className="form-group">
                        <label>Add Photos (max 5)</label>
                        <div className="photo-upload-grid">
                          {newReview.photos.map((photo, index) => (
                            <div key={index} className="photo-preview">
                              <img src={photo} alt="Preview" />
                              <button 
                                onClick={() => removePhoto(index)}
                                className="remove-photo-btn"
                              >
                                ×
                              </button>
                            </div>
                          ))}
                          {newReview.photos.length < 5 && (
                            <label className="photo-upload-btn">
                              +
                              <input type="file" accept="image/*" multiple onChange={handlePhotoUpload} className="hidden" />
                            </label>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-12 mt-16">
                        <button 
                          className="btn-primary flex-1 flex-center" 
                          disabled={reviewLoading || newReview.text.length < 10 || newReview.text.length > 500}
                          onClick={submitReview}
                        >
                          {reviewLoading ? <span className="spinner spinner-rust"></span> : (reviews.some(r => r.customer_id === user?.id) ? "Update Review" : "Submit Review")}
                        </button>
                        {reviews.some(r => r.customer_id === user?.id) && (
                          <button 
                            className="btn-outline danger"
                            disabled={reviewLoading}
                            onClick={() => deleteReview(selectedProduct.id)}
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="card login-prompt-card">
                      <h3>Want to review?</h3>
                      <p className="muted small">Only customers who have purchased this product can leave a review.</p>
                    </div>
                  )}
                </div>

                <div className="reviews-list-container">
                  <div className="reviews-filter-bar">
                    <h3>Reviews</h3>
                    <div className="sort-control">
                      <span className="muted small">Sort by:</span>
                      <select 
                        className="input small" 
                        value={reviewSort}
                        onChange={(e) => {
                          setReviewSort(e.target.value);
                          fetchReviews(selectedProduct.id, 1, e.target.value);
                        }}
                      >
                        <option value="newest">Newest</option>
                        <option value="highest">Highest Rating</option>
                        <option value="lowest">Lowest Rating</option>
                      </select>
                    </div>
                  </div>
                  {reviewLoading && reviews.length === 0 ? (
                    <div className="card text-center py-24">
                      <span className="spinner spinner-rust"></span>
                      <p className="muted mt-8">Loading reviews...</p>
                    </div>
                  ) : !Array.isArray(reviews) || reviews.length === 0 ? (
                    <div className="empty-reviews-state">
                      <p className="muted">No reviews yet. Be the first to share your thoughts!</p>
                    </div>
                  ) : (
                    <>
                      {reviews.map(review => (
                        <div key={review.id} className="review-card card">
                          <div className="review-header">
                            <div className="reviewer-info">
                              <div className="avatar-circle" style={{ background: `hsl(${review.customer?.name?.length * 40 || 0}, 70%, 80%)` }}>
                                {(review.customer?.name || "V").charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <div className="reviewer-name">
                                  {review.customer?.name || "Verified Customer"}
                                  {review.order_id && <span className="verified-badge" title="Verified Purchase">✓ Verified Purchase</span>}
                                </div>
                                <div className="muted tiny">{new Date(review.created_at).toLocaleDateString()}</div>
                              </div>
                            </div>
                            <div className="review-stars">
                              {"★".repeat(Math.max(0, Math.min(5, review.rating))) + "☆".repeat(Math.max(0, Math.min(5, 5 - review.rating)))}
                            </div>
                          </div>
                          
                          {review.title && <h4 className="review-title">{review.title}</h4>}
                          <p className="review-text">{review.review_text}</p>
                          
                          {review.photos && review.photos.length > 0 && (
                            <div className="review-photos">
                              {review.photos.map((p, i) => (
                                <img key={i} src={p} alt="Review photo" onClick={() => window.open(p, '_blank')} />
                              ))}
                            </div>
                          )}

                          <div className="review-actions">
                            <button 
                              className="btn-link" 
                              onClick={() => markReviewHelpful(review.id)}
                            >
                              👍 Helpful ({review.feedback?.[0]?.helpful_count || 0})
                            </button>
                            {user?.id === review.customer_id ? (
                              <>
                                <button 
                                  className="btn-link" 
                                  onClick={() => {
                                    reviewsRef.current?.scrollIntoView({ behavior: 'smooth' });
                                  }}
                                >
                                  ✎ Edit
                                </button>
                                <button 
                                  className="btn-link danger" 
                                  onClick={() => deleteReview(selectedProduct.id)}
                                >
                                  🗑 Delete
                                </button>
                              </>
                            ) : (
                              <button 
                                className="btn-link danger" 
                                onClick={() => reportReview(review.id)}
                              >
                                🏳 Report
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                      
                      {reviewTotalPages > 1 && (
                        <div className="pagination">
                          {Array.from({ length: reviewTotalPages }).map((_, i) => (
                            <button 
                              key={i} 
                              className={`btn small ${reviewPage === i + 1 ? 'active' : ''}`}
                              onClick={() => fetchReviews(selectedProduct.id, i + 1, reviewSort)}
                            >
                              {i + 1}
                            </button>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const logout = async () => {
    try {
      if (role === "customer") await apiPost("/customer/logout");
      if (role === "seller") await apiPost("/seller/logout");
      if (role === "admin") await apiPost("/admin/logout");
    } catch (e) {
      setError(e?.message || "Failed to logout");
    }
    setAuthToken(null);
    setRole(null);
    setUser(null);
    setUserSellerId(null);
    setOpenStoreId(null);
    setView("home");
  };

 

  // Seller (Admin creates sellers)
  const addSeller = async (s) => {
    if (!isAdmin()) return notify("Only Admin can create seller profiles.", "error");
    if (!s.name || !s.email || !s.password || !s.phone) {
      return notify("Please enter all required fields: Name, Email, Password, and Phone.", "error");
    }
    setLoading(true);
    setError("");
    try {
      const payload = { 
        email: s.email, 
        password: s.password, 
        business_name: s.name, 
        phone: s.phone, 
        name: s.name 
      };
      const created = await apiPost("/admin/sellers", payload);
      notify(`Seller created successfully! ID: ${created.id}. Please share credentials with the seller.`, "success");
      const list = await apiGet("/admin/sellers");
      setSellers(list);
    } catch (e) {
      setError(e.message || "Failed to create seller");
      notify("Error creating seller: " + (e.message || "Unknown error"), "error");
    } finally {
      setLoading(false);
      setSellerForm({ name: "", email: "", password: "", phone: "", pincode: "", address: "" });
    }
  };

  const deleteSeller = async (id) => {
    if (!isAdmin()) return notify("Only Admin can delete seller profiles.", "error");
    const seller = sellers.find(s => s.id === id);
    
    if (!window.confirm(`Are you sure you want to delete seller "${seller ? seller.name : id}"? This action cannot be undone.`)) {
      return;
    }

    setLoading(true);
    setError("");
    try {
      await apiDelete(`/admin/sellers/${id}`);
      // Immediate UI removal
      setSellers(prev => prev.filter(s => s.id !== id));
      notify("Seller deleted successfully.", "success");
    } catch (e) {
      if (e.message.includes("404") || e.message.includes("not found")) {
        // If already gone from DB, remove from UI too
        setSellers(prev => prev.filter(s => s.id !== id));
        notify("Seller was already deleted or not found.", "info");
      } else {
        setError(e.message || "Failed to delete seller");
        notify("Error deleting seller: " + (e.message || "Unknown error"), "error");
      }
    } finally {
      setLoading(false);
    }
  };

  //Products 
  const handleImageUrlAdd = () => {
    const url = productForm.imageUrlInput.trim();
    if (!url) return;
    
    // Basic URL validation
    try {
      new URL(url);
    } catch (e) {
      return notify("Please enter a valid image URL.", "error");
    }

    if ((productForm.images?.length || 0) >= 5) {
      return notify("You can only have up to 5 product images.", "error");
    }

    setProductForm(prev => {
      const newImages = [...(prev.images || []), {
        url: url,
        is_primary: (prev.images || []).length === 0,
        display_order: (prev.images || []).length
      }];
      return {
        ...prev,
        images: newImages,
        imageUrlInput: "",
        image: prev.image || (newImages.find(img => img.is_primary)?.url || "")
      };
    });
    notify("Image URL added successfully.", "success");
  };

  const handleProductPhotoUpload = (e) => {
    const files = Array.from(e.target.files);
    if ((productForm.images?.length || 0) + files.length > 5) {
      notify("You can only upload up to 5 product images.", "error");
      return;
    }

    const validFiles = files.filter(file => {
      const isValidType = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(file.type);
      const isValidSize = file.size <= 5 * 1024 * 1024; // 5MB
      if (!isValidType) notify(`${file.name} is not a supported format (JPG, PNG, GIF, WebP).`, "error");
      if (!isValidSize) notify(`${file.name} is too large (max 5MB).`, "error");
      return isValidType && isValidSize;
    });

    validFiles.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setProductForm(prev => {
          const newImages = [...(prev.images || []), {
            url: reader.result,
            is_primary: (prev.images || []).length === 0,
            display_order: (prev.images || []).length
          }];
          return {
            ...prev,
            images: newImages,
            // Automatically set first image as primary if none set
            image: prev.image || (newImages.find(img => img.is_primary)?.url || "")
          };
        });
      };
      reader.readAsDataURL(file);
    });
  };

  const removeProductPhoto = (index) => {
    setProductForm(prev => {
      const newImages = prev.images.filter((_, i) => i !== index);
      // If we removed the primary image, set the first one as primary
      if (prev.images[index]?.is_primary && newImages.length > 0) {
        newImages[0].is_primary = true;
      }
      return { 
        ...prev, 
        images: newImages.map((img, i) => ({ ...img, display_order: i })),
        image: newImages.find(img => img.is_primary)?.url || ""
      };
    });
  };

  const setPrimaryProductPhoto = (index) => {
    setProductForm(prev => {
      const newImages = prev.images.map((img, i) => ({
        ...img,
        is_primary: i === index
      }));
      return {
        ...prev,
        images: newImages,
        image: newImages[index].url
      };
    });
  };

  const moveProductPhoto = (index, direction) => {
    setProductForm(prev => {
      const newImages = [...prev.images];
      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= newImages.length) return prev;
      
      [newImages[index], newImages[targetIndex]] = [newImages[targetIndex], newImages[index]];
      
      // Update display orders
      const updatedImages = newImages.map((img, i) => ({ ...img, display_order: i }));
      return {
        ...prev,
        images: updatedImages,
        image: updatedImages.find(img => img.is_primary)?.url || ""
      };
    });
  };

  const saveProduct = async (form) => {
    if (!isSeller()) return notify("Only Seller can add products.", "error");
    
    // Enhanced Validation
    if (!form.name || form.name.trim().length < 3) return notify("Product name must be at least 3 characters.", "error");
    if (!form.price || isNaN(form.price) || Number(form.price) <= 0) return notify("Please enter a valid price greater than 0.", "error");
    // Category is now optional
    if (!form.brand || form.brand.trim().length < 2) return notify("Please enter a valid brand name (min 2 characters).", "error");
    if (!form.description || form.description.trim().length < 10) return notify("Product description should be at least 10 characters.", "error");
    if (isNaN(form.qty) || Number(form.qty) < 0) return notify("Stock quantity cannot be negative.", "error");
    
    // Validate that at least one image source is provided
    if (!form.images || form.images.length === 0) {
      return notify("At least one product image is required (via URL or upload).", "error");
    }

    setLoading(true);
    setError("");
    try {
      const storesResp = await apiGet("/seller/stores");
      let storeId = (storesResp[0]?.id) || (storesResp?.data?.[0]?.id) || null;
      if (!storeId) {
        const created = await apiPost("/seller/stores", { 
          name: `${userSellerId}'s Store`, 
          slug: `${userSellerId}-default-${Date.now()}` 
        });
        storeId = created.id || created.data?.id;
      }
      const payload = {
        store_id: storeId,
        category_id: form.categoryId || null,
        name: form.name.trim(),
        slug: form.slug || `${form.name.trim().replace(/\s+/g, "-").toLowerCase()}-${Date.now().toString().slice(-4)}`,
        sku: form.sku || `SKU-${Date.now()}`,
        description: form.description || "",
        price_cents: Math.round(Number(form.price) * 100),
        stock_quantity: Number(form.qty || 0),
        images: form.images.map(img => ({
          url: img.url,
          is_primary: img.is_primary,
          display_order: img.display_order
        })),
        brand: form.brand || "",
        is_active: form.is_active !== undefined ? form.is_active : true,
      };

      if (form.id) {
        await apiPatch(`/seller/products/${form.id}`, payload);
        notify("Product updated successfully!", "success");
      } else {
        await apiPost("/seller/products", payload);
        notify("Product created successfully!", "success");
      }
      const resp = await apiGet("/seller/products");
      const list = resp.status === 'success' ? (resp.data.products || resp.data) : (Array.isArray(resp) ? resp : []);
      setProducts(list);
      setProductForm({ 
        id: null, 
        name: "", 
        price: "", 
        category: "", 
        categoryId: null, 
        images: [], 
        imageUrlInput: "",
        qty: 0, 
        brand: "", 
        description: "", 
        is_active: true 
      });
    } catch (e) {
      setError(e.message || "Failed to save product");
      notify("Error: " + (e.message || "Failed to save product"), "error");
    } finally {
      setLoading(false);
    }
  };

  const deleteProduct = async (id) => {
    const prod = products.find((p) => p.id === id);
    if (!prod) return;
    if (!isSeller()) return notify("You do not have permission to delete this product.", "error");
    if (!confirm("Delete this product?")) return;
    setLoading(true);
    setError("");
    try {
      await apiDelete(`/seller/products/${id}`);
      const list = await apiGet("/seller/products");
      setProducts(list);
      notify("Product deleted successfully.", "success");
    } catch (e) {
      setError(e.message || "Failed to delete product");
      notify("Error deleting product: " + (e.message || "Unknown error"), "error");
    } finally {
      setLoading(false);
    }
  };

  //Cart & checkout 
  const fetchCart = async () => {
    try {
      const cartData = await cartAPI.get();
      setCart(cartData);
    } catch (e) {
      console.error("Failed to fetch cart", e);
    }
  };

  const processOfflineQueue = async () => {
    if (offlineQueue.length === 0 || !navigator.onLine) return;
    const queue = [...offlineQueue];
    setOfflineQueue([]);
    for (const item of queue) {
      try {
        await cartAPI.add(item.productId, item.qty);
      } catch (e) {
        console.error("Failed to sync offline item", item, e);
      }
    }
    await fetchCart();
  };

  useEffect(() => {
    window.addEventListener('online', processOfflineQueue);
    return () => window.removeEventListener('online', processOfflineQueue);
  }, [offlineQueue]);

  const addToCart = async (product, qty = 1) => {
    if (!isCustomer()) return notify("Only customers can place orders. Switch to Customer role.", "error");
    
    // Safety check for product and product.id
    if (!product || (!product.id && (!product.product || !product.product.id))) {
      return notify("Cannot add to cart: Product ID is missing.", "error");
    }

    const productId = product.id || product.product?.id;
    const productName = product.name || product.product?.name || "Product";

    setHighlightedItemId(productId);
    // Removed intermediate notification to prevent flickering
    setLoading(true);
    setError("");

    try {
      const updatedCart = await cartAPI.add(productId, qty);
      setCart(updatedCart);
      notify(`Added ${productName} to cart!`, 'success');
    } catch (e) {
      const errorMsg = e.message || "Failed to add to cart";
      setError(errorMsg);
      notify(errorMsg, 'error');
    } finally {
      setLoading(false);
      setTimeout(() => setHighlightedItemId(null), 2000);
    }
  };

  const updateCartQty = async (productId, newQty) => {
    if (newQty < 0) return;
    setLoading(true);
    try {
      const updatedCart = await cartAPI.update(productId, newQty);
      setCart(updatedCart);
    } catch (e) {
      setError(e.message || "Failed to update quantity");
    } finally {
      setLoading(false);
    }
  };

  const removeFromCart = async (productId) => {
    setLoading(true);
    try {
      const updatedCart = await cartAPI.remove(productId);
      setCart(updatedCart);
    } catch (e) {
      setError(e.message || "Failed to remove item");
    } finally {
      setLoading(false);
    }
  };

  const clearCart = async () => {
    setLoading(true);
    try {
      const updatedCart = await cartAPI.clear();
      setCart(updatedCart);
    } catch (e) {
      setError(e.message || "Failed to clear cart");
    } finally {
      setLoading(false);
    }
  };

  async function placeOrder(order) {
    if (!isCustomer() && !isAdmin()) return notify("Only customers can checkout. Switch to Customer role.", "error");
    // Client-side Razorpay demo (for production create server order and verify webhooks)
    const amountPaise = Math.round(order.amount * 100);
    await loadScript("https://checkout.razorpay.com/v1/checkout.js");
    const options = {
      key: RAZORPAY_KEY_ID,
      amount: amountPaise.toString(),
      currency: "INR",
      name: "Veloceeo",
      description: "Order from Veloceeo",
      handler: async function (response) {
        notify("Payment successful. Payment id: " + response.razorpay_payment_id, "success");
        try {
          await clearCart();
        } catch (e) {
          console.error("Failed to clear cart after payment", e);
        }
        setCart(null);
        setView("home");
      },
      prefill: { name: order.customer.name, contact: order.customer.phone },
      theme: { color: "#9B4634" },
    };
    const rzp = new window.Razorpay(options);
    rzp.open();
  }

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const existing = document.querySelector(`script[src="${src}"]`);
      if (existing) return resolve();
      const s = document.createElement("script");
      s.src = src;
      s.onload = resolve;
      s.onerror = reject;
      document.body.appendChild(s);
    });
  }

  useEffect(() => {
    const checkSession = async () => {
      console.log("🔍 [DEBUG] Starting checkSession via /auth/me...");
      try {
        const resp = await apiGet(`/auth/me`, { skipTokenClear: true });
        console.log(`🔍 [DEBUG] Auth check response:`, resp);
        
        if (resp.status === 'success' && resp.data) {
          const { role, user } = resp.data;
          console.log(`✅ [DEBUG] Found valid user for role: ${role}`, user);
          setRole(role);
          setUser(user);
          if (role === "seller") setUserSellerId(user.id);
          if (role === "customer") fetchCart();
          // Fixed: "dashboard" view doesn't exist, use "seller-dashboard" for sellers and "home" for admin
          if (role === "customer") setView("catalog");
          else if (role === "seller") setView("seller-dashboard");
          else if (role === "admin") setView("home");
        } else {
          console.log("ℹ️ [DEBUG] No active session found.");
        }
      } catch (err) {
        if (err.message !== "Not logged in. Please login." && !err.message.includes("401")) {
          console.error("❌ [DEBUG] Unexpected session check error", err);
        } else {
          console.log("ℹ️ [DEBUG] No active session (Expected 401).");
        }
      }
    };
    checkSession();
  }, []);

  useEffect(() => {
    const loadForCustomer = async () => {
      console.log("🔍 [DEBUG] loadForCustomer called");
      try {
        const storesResp = await apiGet("/store/public");
        const list = storesResp?.data?.stores || [];
        setSellers(list);
        const prodsResp = await apiGet("/product/search?name=");
        const prods = prodsResp?.data?.products || [];
        setProducts(prods);
      } catch (e) {
        setError(e?.message || "Failed to load stores and products");
      }
    };
    const loadForSeller = async () => {
      console.log("🔍 [DEBUG] loadForSeller called. Role:", role);
      try {
        const resp = await apiGet("/seller/products");
        console.log("🔍 [DEBUG] loadForSeller response:", resp);
        const list = resp.status === 'success' ? resp.data : resp;
        setProducts(Array.isArray(list) ? list : (list.products || []));
      } catch (e) {
        console.error("❌ [DEBUG] loadForSeller failed:", e.message);
        setError(e?.message || "Failed to load seller products");
      }
    };
    const loadForAdmin = async () => {
      try {
        const list = await apiGet("/admin/sellers");
        setSellers(list);
      } catch (e) {
        setError(e?.message || "Failed to load sellers");
      }
    };
    if (role === "customer") loadForCustomer();
    if (role === "seller") loadForSeller();
    if (role === "admin") loadForAdmin();
  }, [role]);

  useEffect(() => {
    if (view === "catalog" || view === "product-details") {
      const delayDebounceFn = setTimeout(async () => {
        // Only run search if we have a search term or we're already on catalog
        if (view === "product-details" && !activeFilters.search) return;

        try {
          const params = new URLSearchParams();
          if (activeFilters.search) params.append("name", activeFilters.search);
          if (activeFilters.minPrice) params.append("minPrice", String(Number(activeFilters.minPrice) * 100));
          if (activeFilters.maxPrice) params.append("maxPrice", String(Number(activeFilters.maxPrice) * 100));
          if (activeFilters.brands.length) params.append("brands", activeFilters.brands.join(","));
          if (activeFilters.categories.length) params.append("categories", activeFilters.categories.join(","));
          
          const resp = await apiGet(`/product/search?${params.toString()}`);
          setProducts(resp?.data?.products || []);

          // If we searched from product details, switch to catalog to show results
          if (view === "product-details" && activeFilters.search) {
            setView("catalog");
          }
        } catch (e) {
          console.error("Search failed", e);
        }
      }, 500);

      return () => clearTimeout(delayDebounceFn);
    }
  }, [activeFilters, view]);

  useEffect(() => {
    const loadCart = async () => {
      try {
        const updated = await apiGet("/cart");
        setCart(updated);
      } catch (e) {
        setError(e?.message || "Failed to load cart");
      }
    };
    if (role === "customer" && view === "cart") loadCart();
  }, [role, view]);

  //Login Panel
  function LoginPanel({
    showForgotPassword,
    setShowForgotPassword,
    forgotPasswordEmail,
    setForgotPasswordEmail,
    showResetPassword,
    setShowResetPassword,
    resetPasswordToken,
    setResetPasswordToken,
    newPassword,
    setNewPassword,
    confirmPassword,
    setConfirmPassword,
    setError,
    setLoading,
    setAuthToken,
    setRole,
    setOpenStoreId,
    setView,
    setUserSellerId,
    setUser,
    fetchCart,
  }) {
    const [sellerIdInput, setSellerIdInput] = useState("");
    const [sellerPasswordInput, setSellerPasswordInput] = useState("");
    const [custEmail, setCustEmail] = useState("");
    const [custPassword, setCustPassword] = useState("");
    const [showCustomerSignup, setShowCustomerSignup] = useState(false);
    const [signupEmail, setSignupEmail] = useState("");
    const [signupPassword, setSignupPassword] = useState("");
    const [signupName, setSignupName] = useState("");
    const [signupPhone, setSignupPhone] = useState("");
    const [showAdminLogin, setShowAdminLogin] = useState(false);
    const [adminEmail, setAdminEmail] = useState("");
    const [adminPassword, setAdminPassword] = useState("");
    const [rememberMe, setRememberMe] = useState(false);
    const [activeTab, setActiveTab] = useState("customer"); // customer, seller, admin
    const [showRoleMenu, setShowRoleMenu] = useState(false);
    const roleMenuRef = useRef(null);

    useEffect(() => {
      const handleClickOutside = (event) => {
        if (roleMenuRef.current && !roleMenuRef.current.contains(event.target)) {
          setShowRoleMenu(false);
        }
      };
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    useEffect(() => {
      setError("");
    }, [activeTab, showCustomerSignup, showForgotPassword, showResetPassword, setError]);

    useEffect(() => {
      const path = window.location.pathname;
      if (path.startsWith("/reset-password/")) {
        const token = path.split("/reset-password/")[1];
        if (token) {
          setShowResetPassword(true);
          setResetPasswordToken(token);
        }
      }
    }, [setResetPasswordToken, setShowResetPassword]);

    const handleCustomerLogin = () => {
      if (!custEmail || !custPassword) return setError("Email and password are required");
      setLoading(true);
      apiPost("/customer/login", { email: custEmail.trim(), password: custPassword })
        .then((r) => {
          setAuthToken(r.token);
          setRole("customer");
          setUser(r.user || r.customer);
          setOpenStoreId(null);
          setView("catalog");
          fetchCart();
        })
        .catch((e) => {
          if (e?.status === 401) {
            setError("Invalid credentials — please sign up first");
            setShowCustomerSignup(true);
            setSignupEmail(custEmail.trim());
          } else {
            setError(e?.message || "Customer login failed");
          }
        })
        .finally(() => setLoading(false));
    };

    const handleSellerLogin = () => {
      if (!sellerIdInput) return setError("Seller ID is required.");
      setLoading(true);
      const payload = { sellerId: sellerIdInput.trim() };
      if (sellerPasswordInput) payload.password = sellerPasswordInput;

      apiPost("/seller/login", payload)
        .then((r) => {
          setAuthToken(r.token);
          setRole("seller");
          setUser(r.user);
          setUserSellerId(r.user.id);
          setView("seller-dashboard");
        })
        .catch((e) => {
          setError(e?.message || "Seller login failed");
        })
        .finally(() => setLoading(false));
    };

    const handleAdminLogin = () => {
      if (!adminEmail || !adminPassword) return setError("Email and password are required");
      setLoading(true);
      apiPost("/admin/login", { email: adminEmail.trim(), password: adminPassword })
        .then((r) => {
          setAuthToken(r.token);
          setRole("admin");
          setView("home");
        })
        .catch((e) => {
          setError(e?.message || "Admin login failed");
        })
        .finally(() => setLoading(false));
    };

    return (
      <div className={`panel login-panel role-${activeTab}`}>
        {/* Profile Icon and Dropdown */}
        <div className="role-switcher-container" ref={roleMenuRef}>
          <button 
            className="profile-icon-btn" 
            onClick={() => setShowRoleMenu(!showRoleMenu)}
            aria-label="Switch Login Role"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="user-icon">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
          </button>
          
          {showRoleMenu && (
            <div className="role-dropdown fade-in">
              <div className="dropdown-header">Switch Role</div>
              <button 
                className={`dropdown-item ${activeTab === 'customer' ? 'active' : ''}`}
                onClick={() => { setActiveTab('customer'); setShowRoleMenu(false); }}
              >
                <span className="role-dot customer"></span>
                Customer Login
              </button>
              <button 
                className={`dropdown-item ${activeTab === 'seller' ? 'active' : ''}`}
                onClick={() => { setActiveTab('seller'); setShowRoleMenu(false); }}
              >
                <span className="role-dot seller"></span>
                Seller Login
              </button>
              <button 
                className={`dropdown-item ${activeTab === 'admin' ? 'active' : ''}`}
                onClick={() => { setActiveTab('admin'); setShowRoleMenu(false); }}
              >
                <span className="role-dot admin"></span>
                Admin Login
              </button>
            </div>
          )}
        </div>

        <div className="login-container">
          <div className="login-brand">
            <div className="brand-content">
              <img src="/logo_veloceeo.jpg" alt="Veloceeo" className="login-logo" />
              <h1 className="login-brand-title">Veloceeo</h1>
              <p className="login-brand-sub">Promise of Trust, Power of Retail</p>
              <div className="brand-features">
                <div className="feature-item">✓ Secure 24h Sessions</div>
                <div className="feature-item">✓ Local Store Catalog</div>
                <div className="feature-item">✓ Fast Order Fulfillment</div>
              </div>
            </div>
          </div>

          <div className="login-auth-card">
            <div className="auth-content">
              {error && (
                <div className="auth-error fade-in" role="alert">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="error-icon">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                  <span>{error}</span>
                </div>
              )}
              {activeTab === 'customer' && !showCustomerSignup && !showForgotPassword && !showResetPassword && (
                <div className="auth-form fade-in">
                  <h2 className="auth-title">Welcome Back</h2>
                  <p className="auth-subtitle">Sign in to your customer account</p>
                  
                  <div className="form-group">
                    <label htmlFor="custEmail">Email Address</label>
                    <input 
                      id="custEmail"
                      className="input" 
                      placeholder="name@example.com" 
                      type="email" 
                      value={custEmail} 
                      onChange={(e) => { setCustEmail(e.target.value); if(error) setError(""); }} 
                      aria-label="Customer Email Address"
                      aria-required="true"
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="custPassword">Password</label>
                    <input 
                      id="custPassword"
                      className="input" 
                      placeholder="••••••••" 
                      type="password" 
                      value={custPassword} 
                      onChange={(e) => { setCustPassword(e.target.value); if(error) setError(""); }} 
                      aria-label="Customer Password"
                      aria-required="true"
                      required
                    />
                  </div>

                  <div className="form-options">
                    <label className="checkbox-container">
                      <input type="checkbox" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} />
                      <span className="checkmark"></span>
                      Remember me
                    </label>
                    <button className="btn-link" onClick={() => setShowForgotPassword(true)}>Forgot password?</button>
                  </div>

                  <button className="btn-primary w-full btn-login" onClick={handleCustomerLogin} disabled={loading}>
                    {loading ? <span className="spinner"></span> : "Sign In"}
                  </button>

                  <p className="auth-footer">
                    Don't have an account? <button className="btn-link" onClick={() => setShowCustomerSignup(true)}>Create one</button>
                  </p>
                </div>
              )}

              {activeTab === 'customer' && showCustomerSignup && (
                <div className="auth-form fade-in">
                  <h2 className="auth-title">Create Account</h2>
                  <p className="auth-subtitle">Join the Veloceeo retail network</p>

                  <div className="form-grid">
                    <div className="form-group">
                      <label htmlFor="signupName">Full Name</label>
                      <input 
                        id="signupName"
                        className="input" 
                        placeholder="John Doe" 
                        value={signupName} 
                        onChange={(e) => { setSignupName(e.target.value); if(error) setError(""); }} 
                        aria-label="Full Name"
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor="signupPhone">Phone Number</label>
                      <input 
                        id="signupPhone"
                        className="input" 
                        placeholder="+91 98765 43210" 
                        value={signupPhone} 
                        onChange={(e) => { setSignupPhone(e.target.value); if(error) setError(""); }} 
                        aria-label="Phone Number"
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label htmlFor="signupEmail">Email Address</label>
                    <input 
                      id="signupEmail"
                      className="input" 
                      placeholder="name@example.com" 
                      type="email" 
                      value={signupEmail} 
                      onChange={(e) => { setSignupEmail(e.target.value); if(error) setError(""); }} 
                      aria-label="Email Address"
                      aria-required="true"
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="signupPassword">Password</label>
                    <input 
                      id="signupPassword"
                      className="input" 
                      placeholder="Min. 8 characters" 
                      type="password" 
                      value={signupPassword} 
                      onChange={(e) => { setSignupPassword(e.target.value); if(error) setError(""); }} 
                      aria-label="Password"
                      aria-required="true"
                      required
                    />
                  </div>

                  <button 
                    className="btn-primary w-full btn-login" 
                    onClick={() => {
                      if (!signupEmail || !signupPassword) return setError("Email and password are required");
                      if (!/^[\w-.]+@([\w-]+\.)+[\w-]{2,4}$/.test(signupEmail)) return setError("Please enter a valid email address.");
                      if (signupPassword.length < 8) return setError("Password must be at least 8 characters long.");
                      setLoading(true);
                      apiPost("/customer/signup", { email: signupEmail.trim(), password: signupPassword, name: signupName || undefined, phone: signupPhone || undefined })
                        .then(() => apiPost("/customer/login", { email: signupEmail.trim(), password: signupPassword }))
                        .then((r) => {
                          setAuthToken(r.token);
                          setRole("customer");
                          setOpenStoreId(null);
                          setView("catalog");
                          fetchCart();
                        })
                        .catch((e) => setError(e?.message || "Customer signup failed"))
                        .finally(() => setLoading(false));
                    }} 
                    disabled={loading}
                  >
                    {loading ? <span className="spinner"></span> : "Create Account"}
                  </button>

                  <p className="auth-footer">
                    Already have an account? <button className="btn-link" onClick={() => setShowCustomerSignup(false)}>Sign in</button>
                  </p>
                </div>
              )}

              {activeTab === 'seller' && (
                <div className="auth-form fade-in">
                  <div className="form-header">
                    <button className="btn-back-login" onClick={() => setActiveTab('customer')}>
                      ← Back
                    </button>
                    <h2 className="auth-title">Seller Portal</h2>
                  </div>
                  <p className="auth-subtitle">Manage your store and products</p>

                  <div className="form-group">
                    <label htmlFor="sellerId">Seller ID</label>
                    <input 
                      id="sellerId"
                      className="input" 
                      placeholder="Enter your unique Seller ID" 
                      value={sellerIdInput} 
                      onChange={(e) => { setSellerIdInput(e.target.value.trim()); if(error) setError(""); }} 
                      aria-label="Seller ID"
                      aria-required="true"
                      required
                    />
                    <p className="input-hint">ID-only login supported for quick access.</p>
                  </div>

                  <div className="form-group">
                    <label htmlFor="sellerPassword">Password (Optional)</label>
                    <input 
                      id="sellerPassword"
                      className="input" 
                      type="password" 
                      placeholder="••••••••" 
                      value={sellerPasswordInput} 
                      onChange={(e) => { setSellerPasswordInput(e.target.value); if(error) setError(""); }} 
                      aria-label="Seller Password"
                    />
                    <p className="input-hint">Traditional login with password is also available.</p>
                  </div>

                  <button className="btn-primary w-full btn-login" onClick={handleSellerLogin} disabled={loading}>
                    {loading ? <span className="spinner"></span> : "Sign In as Seller"}
                  </button>

                  <div className="auth-info-box">
                    <p className="tiny">Veloceeo provides sellers with tools to digitize their local inventory and reach more customers.</p>
                  </div>
                </div>
              )}

              {activeTab === 'admin' && (
                <div className="auth-form fade-in">
                  <div className="form-header">
                    <button className="btn-back-login" onClick={() => setActiveTab('customer')}>
                      ← Back
                    </button>
                    <h2 className="auth-title">Administrator</h2>
                  </div>
                  <p className="auth-subtitle">System management and analytics</p>

                  <div className="form-group">
                    <label htmlFor="adminEmail">Admin Email</label>
                    <input 
                      id="adminEmail"
                      className="input" 
                      placeholder="admin@veloceeo.com" 
                      type="email" 
                      value={adminEmail} 
                      onChange={(e) => { setAdminEmail(e.target.value); if(error) setError(""); }} 
                      aria-label="Admin Email"
                      aria-required="true"
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="adminPassword">Password</label>
                    <input 
                      id="adminPassword"
                      className="input" 
                      placeholder="••••••••" 
                      type="password" 
                      value={adminPassword} 
                      onChange={(e) => { setAdminPassword(e.target.value); if(error) setError(""); }} 
                      aria-label="Admin Password"
                      aria-required="true"
                      required
                    />
                  </div>

                  <button className="btn-primary w-full btn-login" onClick={handleAdminLogin} disabled={loading}>
                    {loading ? <span className="spinner"></span> : "System Login"}
                  </button>
                </div>
              )}

              {showForgotPassword && activeTab === 'customer' && (
                <div className="auth-form fade-in">
                  <h2 className="auth-title">Reset Password</h2>
                  <p className="auth-subtitle">We'll send a link to your email</p>

                  <div className="form-group">
                    <label htmlFor="forgotEmail">Email Address</label>
                    <input 
                      id="forgotEmail"
                      className="input" 
                      placeholder="name@example.com" 
                      type="email" 
                      value={forgotPasswordEmail} 
                      onChange={(e) => { setForgotPasswordEmail(e.target.value); if(error) setError(""); }} 
                      aria-label="Forgot Password Email"
                      aria-required="true"
                      required
                    />
                  </div>

                  <button 
                    className="btn-primary w-full btn-login" 
                    onClick={() => {
                      if (!forgotPasswordEmail) return setError("Email is required");
                      if (!/^[\w-.]+@([\w-]+\.)+[\w-]{2,4}$/.test(forgotPasswordEmail)) return setError("Please enter a valid email address.");
                      setLoading(true);
                      apiPost("/customer/forgot-password", { email: forgotPasswordEmail.trim() })
                        .then(() => {
                          notify("If an account with that email exists, a password reset link has been sent.", "info");
                          setShowForgotPassword(false);
                          setForgotPasswordEmail("");
                        })
                        .catch((e) => setError(e?.message || "Failed to send reset email"))
                        .finally(() => setLoading(false));
                    }}
                    disabled={loading}
                  >
                    {loading ? <span className="spinner"></span> : "Send Reset Link"}
                  </button>
                  <button className="btn-link w-full mt-10" onClick={() => setShowForgotPassword(false)}>Back to Login</button>
                </div>
              )}

              {showResetPassword && (
                <div className="auth-form fade-in">
                  <h2 className="auth-title">New Password</h2>
                  <p className="auth-subtitle">Secure your account</p>

                  <div className="form-group">
                    <label htmlFor="newPassword">New Password</label>
                    <input 
                      id="newPassword"
                      className="input" 
                      placeholder="Min. 8 characters" 
                      type="password" 
                      value={newPassword} 
                      onChange={(e) => { setNewPassword(e.target.value); if(error) setError(""); }} 
                      aria-label="New Password"
                      aria-required="true"
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="confirmPassword">Confirm Password</label>
                    <input 
                      id="confirmPassword"
                      className="input" 
                      placeholder="Repeat new password" 
                      type="password" 
                      value={confirmPassword} 
                      onChange={(e) => { setConfirmPassword(e.target.value); if(error) setError(""); }} 
                      aria-label="Confirm Password"
                      aria-required="true"
                      required
                    />
                  </div>

                  <button 
                    className="btn-primary w-full btn-login" 
                    onClick={() => {
                      if (!newPassword || !confirmPassword) return setError("Please enter and confirm your new password.");
                      if (newPassword.length < 8) return setError("New password must be at least 8 characters long.");
                      if (newPassword !== confirmPassword) return setError("Passwords do not match.");
                      setLoading(true);
                      apiPost("/customer/reset-password", { token: resetPasswordToken, password: newPassword })
                        .then(() => {
                          notify("Password reset successful.", "success");
                          setShowResetPassword(false);
                          setResetPasswordToken("");
                          setNewPassword("");
                          setConfirmPassword("");
                          setActiveTab("customer");
                        })
                        .catch((e) => setError(e?.message || "Failed to reset password."))
                        .finally(() => setLoading(false));
                    }}
                    disabled={loading}
                  >
                    {loading ? <span className="spinner"></span> : "Update Password"}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  //Render login if no role 
  if (!role) return <LoginPanel
    showForgotPassword={showForgotPassword}
    setShowForgotPassword={setShowForgotPassword}
    forgotPasswordEmail={forgotPasswordEmail}
    setForgotPasswordEmail={setForgotPasswordEmail}
    showResetPassword={showResetPassword}
    setShowResetPassword={setShowResetPassword}
    resetPasswordToken={resetPasswordToken}
    setResetPasswordToken={setResetPasswordToken}
    newPassword={newPassword}
    setNewPassword={setNewPassword}
    confirmPassword={confirmPassword}
    setConfirmPassword={setConfirmPassword}
    setError={setError}
    setLoading={setLoading}
    setAuthToken={setAuthToken}
    setRole={setRole}
    setOpenStoreId={setOpenStoreId}
    setView={setView}
    setUserSellerId={setUserSellerId}
    setUser={setUser}
    fetchCart={fetchCart}
  />;
  /* ---------- JSX render ---------- */
  return (
    <div className="app">
      <header className="main-header">
        <div className={(view === 'catalog' || view === 'product-details' || view === 'admin-dashboard') ? "container-fluid" : "container"}>
          <div className="header-content">
            <div className="header-logo" onClick={() => { setOpenStoreId(null); setView("home"); }}>
              <img src="/logo_veloceeo.jpg" alt="Veloceeo" />
              <span className="brand-name">Veloceeo</span>
            </div>

            <div className="header-search">
              <input 
                type="text" 
                placeholder="Search for products, brands and more" 
                value={activeFilters.search}
                onChange={(e) => setActiveFilters(prev => ({ ...prev, search: e.target.value }))}
                onKeyDown={(e) => e.key === 'Enter' && applyFilters()}
              />
              <span className="search-icon" onClick={applyFilters}>🔍</span>
            </div>

            <div className="header-actions">
              {/* Desktop Actions */}
              <div className="desktop-actions">
                <div className="action-item" onClick={() => { setOpenStoreId(null); setView("home"); }}>
                  <span>🏠 Home</span>
                </div>
                
                {(isCustomer() || isAdmin()) && (
                  <div className="action-item" onClick={() => setView("catalog")}>
                    <span>📦 Catalog</span>
                  </div>
                )}

                {(isCustomer() || isAdmin()) && (
                  <div className="action-item" onClick={() => setView("cart")}>
                    <div className="cart-icon-wrapper">
                      <span>🛒 Cart</span>
                      {cart?.totalItems > 0 && <span className="cart-badge">{cart.totalItems}</span>}
                    </div>
                  </div>
                )}

                {(isSeller() || isAdmin()) && (
                  <div className="action-item" onClick={() => setView("seller-dashboard")}>
                    <span>📊 Dashboard</span>
                  </div>
                )}
              </div>

              {/* Profile Icon and Dropdown */}
              <div className="profile-container" ref={profileMenuRef}>
                <button 
                  className="profile-icon-btn" 
                  onClick={() => setShowProfileMenu(!showProfileMenu)}
                  aria-label="User Profile"
                  aria-haspopup="true"
                  aria-expanded={showProfileMenu}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="user-icon">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                </button>
                
                {showProfileMenu && (
                  <div className="profile-dropdown fade-in">
                    <div className="dropdown-header">
                      <div className="user-name">{user?.name || role?.toUpperCase()}</div>
                      <div className="user-email">{user?.email}</div>
                    </div>
                    <button className="dropdown-item" onClick={() => { setView("edit-profile"); setShowProfileMenu(false); }}>
                      <span>👤 Edit Profile</span>
                    </button>
                    <button className="dropdown-item" onClick={() => { setView("account-settings"); setShowProfileMenu(false); }}>
                      <span>⚙️ Account Settings</span>
                    </button>
                    <div className="dropdown-divider"></div>
                    <button className="dropdown-item text-danger" onClick={() => { logout(); setShowProfileMenu(false); }}>
                      <span>🚪 Logout</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Mobile Hamburger Menu Icon */}
              <button 
                className={`hamburger-menu ${isMobileMenuOpen ? 'open' : ''}`}
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                aria-label={isMobileMenuOpen ? "Close menu" : "Open menu"}
                aria-expanded={isMobileMenuOpen}
                aria-controls="mobile-navigation"
              >
                <span></span>
                <span></span>
                <span></span>
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        <div 
          id="mobile-navigation"
          className={`mobile-nav-drawer ${isMobileMenuOpen ? 'open' : ''}`}
          ref={mobileMenuRef}
        >
          <div className="mobile-nav-content">
            <div className="mobile-nav-item" onClick={() => { setOpenStoreId(null); setView("home"); setIsMobileMenuOpen(false); }}>
              <span className="nav-icon">🏠</span>
              <span className="nav-text">Home</span>
            </div>
            
            {(isCustomer() || isAdmin()) && (
              <div className="mobile-nav-item" onClick={() => { setView("catalog"); setIsMobileMenuOpen(false); }}>
                <span className="nav-icon">📦</span>
                <span className="nav-text">Catalog</span>
              </div>
            )}

            {(isCustomer() || isAdmin()) && (
              <div className="mobile-nav-item" onClick={() => { setView("cart"); setIsMobileMenuOpen(false); }}>
                <div className="cart-icon-wrapper">
                  <span className="nav-icon">🛒</span>
                  <span className="nav-text">Cart</span>
                  {cart?.totalItems > 0 && <span className="cart-badge mobile">{cart.totalItems}</span>}
                </div>
              </div>
            )}

            {(isSeller() || isAdmin()) && (
              <div className="mobile-nav-item" onClick={() => { setView("seller-dashboard"); setIsMobileMenuOpen(false); }}>
                <span className="nav-icon">📊</span>
                <span className="nav-text">Dashboard</span>
              </div>
            )}

            {role && (
                <>
                  <div className="mobile-nav-item" onClick={() => { setView("edit-profile"); setIsMobileMenuOpen(false); }}>
                    <span className="nav-icon">👤</span>
                    <span className="nav-text">Edit Profile</span>
                  </div>
                  <div className="mobile-nav-item" onClick={() => { setView("account-settings"); setIsMobileMenuOpen(false); }}>
                    <span className="nav-icon">⚙️</span>
                    <span className="nav-text">Account Settings</span>
                  </div>
                  <div className="mobile-nav-item logout" onClick={() => { logout(); setIsMobileMenuOpen(false); }}>
                    <span className="nav-icon">🚪</span>
                    <span className="nav-text">Logout</span>
                  </div>
                </>
              )}
          </div>
        </div>
      </header>

      {/* Role and Sub-header */}
      <div className="sub-header">
        <div className={(view === 'catalog' || view === 'product-details' || view === 'admin-dashboard') ? "container-fluid flex-between" : "container flex-between"}>
          <div className="nav-links">
            <span className="nav-link" onClick={() => setView("home")}>Trending</span>
            <span className="nav-link" onClick={() => setView("catalog")}>All Products</span>
            {isSeller() && <span className="nav-link" onClick={() => setView("seller-dashboard")}>My Store</span>}
          </div>
          <div className="role-badge">
            <span className="muted tiny mr-4">Logged in as:</span>
            <span>{role.toUpperCase()}</span>
            {isSeller() && userSellerId && <span className="ml-8 muted tiny">ID: {userSellerId}</span>}
          </div>
        </div>
      </div>

      {cartNotification && (
        <div className={`toast-notification ${cartNotification.type} ${cartNotification.isClosing ? 'closing' : ''}`} role="alert">
          <div className="toast-message">{cartNotification.message}</div>
          <button 
            className="toast-close" 
            onClick={() => {
              setCartNotification(prev => ({ ...prev, isClosing: true }));
              setTimeout(() => setCartNotification(null), 400);
            }}
            aria-label="Close notification"
          >
            ×
          </button>
        </div>
      )}

      <main className={(view === 'catalog' || view === 'product-details' || view === 'admin-dashboard' || (view === 'home' && isAdmin())) ? "container-fluid" : "container"}>
        {error && (
          <div className="card error-card mb-12">
            <div className="flex-between">
              <div className="muted error-text">{error}</div>
              <button className="btn small" onClick={() => setError("")}>Dismiss</button>
            </div>
          </div>
        )}
        {loading && <div className="muted tiny mb-12">Loading…</div>}
        
        {/* HOME (role-aware) */}
        {view === "home" && (
          <div className="view-home">
            {isAdmin() ? renderAdminDashboard() : (
              <div>
                <div className="card mb-24">
                  <h2 className="mb-12">Stores near you</h2>
                  <p className="muted mb-24">Browse local stores and view their products. Click a store to open its catalog.</p>

                  <div className="grid gap-12">
                    {sellers.map((s) => (
                      <div key={s.id} className="list-item flex-between p-12">
                        <div>
                          <div className="seller-name bold">{s.name}</div>
                          <div className="muted tiny">ID: <code>{s.id}</code></div>
                        </div>
                        <div className="flex gap-12">
                          <button className="btn-primary" onClick={() => {
                            resetFilters();
                            setOpenStoreId(s.id);
                            setView("catalog");
                          }}>Open Store</button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="card mt-24">
                  <div className="flex-between mb-16">
                    <h3 className="m-0">Featured Products</h3>
                    <button className="btn-outline btn-small" onClick={() => setView("catalog")}>View All</button>
                  </div>
                  <div className="product-grid">
                    {products.length === 0 && <div className="muted p-16">No products available yet.</div>}
                    {products.slice(0, 8).map(p => {
                      const seller = sellers.find(s => s.id === p.sellerId) || { name: "Veloceeo" };
                      const isWishlisted = wishlist.some(wp => wp.id === p.id);
                      return (
                        <div 
                          key={p.id} 
                          className="product-card fade-in"
                          onClick={() => openProductDetails(p)}
                        >
                          <div className="product-card-image-wrapper">
                            <img src={p.image || "/logo_veloceeo.jpg"} className="product-card-img" alt={p.name} />
                            <button 
                              className={`wishlist-toggle ${isWishlisted ? 'active' : ''}`}
                              onClick={(e) => { e.stopPropagation(); toggleWishlist(p); }}
                            >
                              {isWishlisted ? "❤️" : "🤍"}
                            </button>
                            {p.stock_quantity <= 0 && <div className="stock-badge out-of-stock">Out of Stock</div>}
                          </div>
                          <div className="product-card-content">
                            <div className="product-brand">{p.brand || seller.name}</div>
                            <div className="product-title">{p.name}</div>
                            <div className="product-rating">
                              <span className="rating-badge">
                                {Math.round(p.avgRating || p.average_rating || 4.5)} ★
                              </span>
                              <span className="muted tiny">({p.reviewCount || p.review_count || 0})</span>
                            </div>
                            <div className="product-price-row">
                              <span className="product-price">₹{p.price_cents ? (p.price_cents/100).toLocaleString() : (p.price || 0).toLocaleString()}</span>
                              {p.old_price && <span className="product-old-price">₹{p.old_price}</span>}
                              {!p.old_price && <span className="product-old-price">₹{((p.price_cents ? (p.price_cents/100) : (p.price || 0)) * 1.2).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>}
                              <span className="product-discount">20% OFF</span>
                            </div>
                            
                            <div className="mt-12" onClick={e => e.stopPropagation()}>
                              <button 
                                className="btn-primary btn-block btn-small" 
                                disabled={p.stock_quantity <= 0}
                                onClick={() => addToCart(p, 1)}
                              >
                                {p.stock_quantity > 0 ? "Add to Cart" : "Out of Stock"}
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* SELLER DASHBOARD */}
        {view === "seller-dashboard" && (
          <section>
            <div className="card">
              <div className="flex-between">
                <h2>Product Manager</h2>
                <div className="muted tiny">Managing: {userSellerId || "—"}</div>
              </div>

              {!userSellerId && <p className="muted">Select a seller profile first (admin can pick from Home).</p>}

              {userSellerId && (
                <>
                  <div className="card p-24">
                    <h3 className="mb-16">{productForm.id ? "Edit Product" : "Add New Product"}</h3>
                    
                    <div className="grid grid-cols-3 gap-16">
                      <div className="form-group">
                        <label>Product Name</label>
                        <input className="input" placeholder="e.g. Premium Cotton T-Shirt" value={productForm.name} onChange={(e) => setProductForm({ ...productForm, name: e.target.value })} />
                      </div>
                      <div className="form-group">
                        <label>Price (₹)</label>
                        <input className="input" placeholder="0.00" type="number" value={productForm.price} onChange={(e) => setProductForm({ ...productForm, price: e.target.value })} />
                      </div>
                      <div className="form-group">
                        <label>Brand</label>
                        <input className="input" placeholder="e.g. Veloceeo" value={productForm.brand || ""} onChange={(e) => setProductForm({ ...productForm, brand: e.target.value })} />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-16">
                      <div className="form-group">
                        <label>Category</label>
                        <select 
                          className="input" 
                          value={productForm.categoryId || ""} 
                          onChange={(e) => {
                            const catId = e.target.value ? Number(e.target.value) : null;
                            const cat = flattenedCategories.find(c => c.id === catId);
                            setProductForm({ ...productForm, categoryId: catId, category: cat ? cat.name : "" });
                          }}
                        >
                          <option value="">Select Category</option>
                          {flattenedCategories.map(cat => (
                            <option key={cat.id} value={cat.id}>
                              {"\u00A0".repeat(cat.depth * 4)}{cat.depth > 0 ? "— " : ""}{cat.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="form-group">
                        <label>Stock Quantity</label>
                        <input className="input" placeholder="Available units" type="number" value={productForm.qty} onChange={(e) => setProductForm({ ...productForm, qty: Number(e.target.value) })} />
                      </div>
                    </div>

                    <div className="form-group mb-16">
                      <label className="label">Product Description</label>
                      <textarea 
                        className="input" 
                        placeholder="Provide a detailed description of your product..." 
                        rows={4}
                        value={productForm.description || ""} 
                        onChange={(e) => setProductForm({ ...productForm, description: e.target.value })} 
                      />
                    </div>

                    <div className="form-group mb-16">
                      <label className="label">Product Images (Max 5)</label>
                      
                      <div className="image-sources-container grid grid-cols-1 gap-12 mt-8 mb-16">
                        <div className="url-input-group flex gap-8">
                          <input 
                            className="input flex-1" 
                            placeholder="Enter image URL (e.g. https://example.com/image.jpg)" 
                            value={productForm.imageUrlInput || ""} 
                            onChange={(e) => setProductForm({ ...productForm, imageUrlInput: e.target.value })}
                            onKeyPress={(e) => e.key === 'Enter' && handleImageUrlAdd()}
                          />
                          <button className="btn btn-outline small" onClick={handleImageUrlAdd}>Add URL</button>
                        </div>
                      </div>

                      <div className="photo-upload-grid mt-8">
                        {productForm.images?.map((photo, index) => (
                          <div key={index} className={`photo-preview ${photo.is_primary ? 'primary-photo' : ''}`}>
                            <img src={photo.url} alt="Preview" />
                            <div className="photo-actions">
                              <button onClick={() => setPrimaryProductPhoto(index)} className="set-primary-btn" title="Set as Primary">★</button>
                              {index > 0 && <button onClick={() => moveProductPhoto(index, 'up')} className="move-photo-btn" title="Move Up">↑</button>}
                              {index < productForm.images.length - 1 && <button onClick={() => moveProductPhoto(index, 'down')} className="move-photo-btn" title="Move Down">↓</button>}
                              <button onClick={() => removeProductPhoto(index)} className="remove-photo-btn">×</button>
                            </div>
                          </div>
                        ))}
                        {(!productForm.images || productForm.images.length < 5) && (
                          <label className="photo-upload-btn" title="Upload local image">
                            <span className="tiny mb-4">Upload</span>
                            +
                            <input type="file" accept="image/jpeg,image/png,image/gif,image/webp" multiple onChange={handleProductPhotoUpload} className="hidden" />
                          </label>
                        )}
                      </div>
                      <p className="tiny muted mt-8">Provide at least one image via URL or upload. Max 5 images. (JPG, PNG, GIF, WebP, Max 5MB per file).</p>
                    </div>

                    <div className="flex-between mt-16 mb-24">
                      <label className="checkbox-container">
                        <input 
                          type="checkbox" 
                          checked={productForm.is_active} 
                          onChange={(e) => setProductForm({ ...productForm, is_active: e.target.checked })} 
                        />
                        <span className="checkmark"></span>
                        <span className="ml-24">Product is Active (Visible in Catalog)</span>
                      </label>
                    </div>

                    <div className="mt-24 flex gap-12">
                      <button className="btn-primary" onClick={() => saveProduct(productForm)}>{productForm.id ? "Update Product" : "Save Product"}</button>
                      <button className="btn" onClick={() => setProductForm({ 
                        id: null, 
                        name: "", 
                        price: "", 
                        category: "", 
                        categoryId: null, 
                        images: [], 
                        imageUrlInput: "",
                        qty: 0, 
                        brand: "", 
                        description: "", 
                        is_active: true 
                      })}>Clear Form</button>
                    </div>
                  </div>

                  <h3 className="mt-24 mb-16">Your Products</h3>
                  
                  {/* Dashboard Filters */}
                  <div className="card mb-24 p-16 flex flex-wrap gap-12 items-center">
                    <div className="flex-1 min-w-200">
                      <input 
                        className="input" 
                        placeholder="Search products..." 
                        value={sellerProductsFilter.search} 
                        onChange={(e) => setSellerProductsFilter(prev => ({ ...prev, search: e.target.value }))} 
                      />
                    </div>
                    <select 
                      className="input w-auto" 
                      value={sellerProductsFilter.status} 
                      onChange={(e) => setSellerProductsFilter(prev => ({ ...prev, status: e.target.value }))}
                    >
                      <option value="all">All Status</option>
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                    <select 
                      className="input w-auto" 
                      value={sellerProductsFilter.sort} 
                      onChange={(e) => setSellerProductsFilter(prev => ({ ...prev, sort: e.target.value }))}
                    >
                      <option value="newest">Newest First</option>
                      <option value="oldest">Oldest First</option>
                      <option value="price-high">Price: High to Low</option>
                      <option value="price-low">Price: Low to High</option>
                      <option value="stock-low">Low Stock First</option>
                    </select>
                  </div>

                  <div className="product-grid">
                    {filteredSellerProducts.length === 0 && <p className="muted">No products matching filters.</p>}
                    {filteredSellerProducts.map(p => (
                      <div key={p.id} className={`product-card fade-in ${!p.is_active ? 'opacity-60' : ''}`}>
                        <div className="product-card-image-wrapper">
                          <img src={p.image || "/logo_veloceeo.jpg"} className="product-card-img" alt={p.name} />
                          {!p.is_active && (
                            <div className="stock-badge inactive-badge">INACTIVE</div>
                          )}
                          {p.stock_quantity <= 5 && (
                            <div className="stock-badge low-stock">LOW STOCK</div>
                          )}
                        </div>
                        <div className="product-card-content">
                          <div className="product-brand">{p.category?.name || p.category}</div>
                          <div className="product-title">{p.name}</div>
                          <div className="muted tiny mb-8">Created {new Date(p.created_at).toLocaleDateString()}</div>
                          
                          <div className="mt-auto pt-12 border-top">
                            {editingProductId === p.id ? (
                              <div className="flex flex-column gap-8">
                                <div className="flex-between">
                                  <label className="tiny muted">Price (₹)</label>
                                  <input 
                                    type="number" 
                                    className="input small w-80" 
                                    defaultValue={p.price_cents / 100} 
                                    onBlur={async (e) => {
                                      const val = Math.round(Number(e.target.value) * 100);
                                      if (val !== p.price_cents) {
                                        await apiPatch(`/seller/products/${p.id}`, { price_cents: val });
                                        const list = await apiGet("/seller/products");
                                        setProducts(list);
                                      }
                                    }}
                                  />
                                </div>
                                <div className="flex-between">
                                  <label className="tiny muted">Stock</label>
                                  <input 
                                    type="number" 
                                    className="input small w-80" 
                                    defaultValue={p.stock_quantity} 
                                    onBlur={async (e) => {
                                      const val = Number(e.target.value);
                                      if (val !== p.stock_quantity) {
                                        await apiPatch(`/seller/products/${p.id}/stock`, { quantity: val });
                                        const list = await apiGet("/seller/products");
                                        setProducts(list);
                                        notify("Stock updated successfully.", "success");
                                      }
                                    }}
                                  />
                                </div>
                                <div className="flex-between">
                                  <label className="tiny muted">Active Status</label>
                                  <input 
                                    type="checkbox" 
                                    checked={p.is_active} 
                                    onChange={async (e) => {
                                      const val = e.target.checked;
                                      await apiPatch(`/seller/products/${p.id}`, { is_active: val });
                                      const list = await apiGet("/seller/products");
                                      setProducts(list);
                                      notify(`Product ${val ? 'activated' : 'deactivated'} successfully.`, "success");
                                    }}
                                  />
                                </div>
                                <button className="btn small w-full" onClick={() => setEditingProductId(null)}>Done</button>
                              </div>
                            ) : (
                              <>
                                <div className="flex-between mb-12">
                                  <span className="bold text-lg">₹{p.price_cents / 100}</span>
                                  <span className={p.stock_quantity > 0 ? "text-success tiny bold" : "text-danger tiny bold"}>
                                    Stock: {p.stock_quantity}
                                  </span>
                                </div>
                                <div className="flex gap-4">
                                  <button className="btn small btn-outline flex-1" onClick={() => setProductForm({
                                    id: p.id,
                                    name: p.name,
                                    price: p.price_cents / 100,
                                    category: p.category?.name || p.category,
                                    categoryId: p.category_id,
                                    image: p.image || "",
                                    qty: p.stock_quantity,
                                    brand: p.brand || "",
                                    description: p.description || "",
                                    is_active: p.is_active
                                  })}>Edit</button>
                                  <button className="btn small btn-outline flex-1" onClick={() => setEditingProductId(p.id)}>Quick</button>
                                  <button className="btn small btn-outline text-danger flex-1" onClick={() => deleteProduct(p.id)}>Delete</button>
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <h3 className="mt-24 mb-16">Customer Reviews for Your Products</h3>
                  <div className="card">
                    {reviewLoading && <div className="p-24 text-center muted">Loading reviews...</div>}
                    {!reviewLoading && sellerReviews.length === 0 && <div className="p-24 text-center muted">No reviews received yet.</div>}
                    {!reviewLoading && sellerReviews.length > 0 && (
                      <div className="flex flex-column gap-16">
                        {sellerReviews.map(r => (
                          <div key={r.id} className="p-16 border rounded">
                            <div className="flex-between mb-8">
                              <div className="bold">{r.product?.name}</div>
                              <div className="muted tiny">{new Date(r.created_at).toLocaleDateString()}</div>
                            </div>
                            <div className="stars mb-8 text-gold">
                              {"★".repeat(r.rating) + "☆".repeat(5 - r.rating)}
                            </div>
                            <div className="small mb-8">{r.review_text}</div>
                            <div className="muted tiny">By: {r.customer?.name}</div>
                          </div>
                        ))}
                        {sellerReviewTotalPages > 1 && (
                          <div className="flex flex-center gap-16 mt-16">
                            <button 
                              className="btn btn-small" 
                              disabled={sellerReviewPage === 1}
                              onClick={() => fetchSellerReviews(sellerReviewPage - 1)}
                            >Previous</button>
                            <span className="small">Page {sellerReviewPage} of {sellerReviewTotalPages}</span>
                            <button 
                              className="btn btn-small" 
                              disabled={sellerReviewPage === sellerReviewTotalPages}
                              onClick={() => fetchSellerReviews(sellerReviewPage + 1)}
                            >Next</button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </section>
        )}

        {/* CATALOG */}
        {view === "catalog" && (
          <section className="catalog-layout">
            {/* FILTER OVERLAY */}
            {isFilterOpen && (
              <div 
                className="mobile-overlay active" 
                onClick={() => setIsFilterOpen(false)}
              ></div>
            )}
            
            {/* FILTER SIDEBAR */}
            <aside 
              ref={filterRef}
              className={`sidebar ${isFilterOpen ? 'open' : ''}`}
              id="filter-sidebar"
              aria-label="Product filters"
              role={isFilterOpen ? "dialog" : "complementary"}
              aria-modal={isFilterOpen ? "true" : "false"}
            >
              <div className="sidebar-title flex-between">
                <span>Filters</span>
                <div className="flex gap-8">
                  <button className="btn small" onClick={resetFilters}>Reset</button>
                  <button 
                    className="filter-close-btn" 
                    onClick={() => setIsFilterOpen(false)}
                    aria-label="Close filters"
                  >✕</button>
                </div>
              </div>

              <div className="filter-section">
                <div className="filter-title">Search</div>
                <input 
                  className="input" 
                  placeholder="Product name..." 
                  value={activeFilters.search} 
                  onChange={(e) => setActiveFilters(prev => ({ ...prev, search: e.target.value }))}
                />
              </div>

              <div className="filter-section">
                <div className="filter-title">Price Range</div>
                <div className="flex gap-8">
                  <input 
                    className="input" 
                    type="number" 
                    placeholder="Min" 
                    value={activeFilters.minPrice}
                    onChange={(e) => setActiveFilters(prev => ({ ...prev, minPrice: e.target.value }))}
                  />
                  <input 
                    className="input" 
                    type="number" 
                    placeholder="Max" 
                    value={activeFilters.maxPrice}
                    onChange={(e) => setActiveFilters(prev => ({ ...prev, maxPrice: e.target.value }))}
                  />
                </div>
              </div>

              <div className="filter-section">
                <div className="filter-title">Brands</div>
                <input 
                  className="input small mb-8" 
                  placeholder="Search brands..." 
                  value={brandSearch}
                  onChange={(e) => setBrandSearch(e.target.value)}
                />
                <div className="filter-scroll-area">
                  {filterMetadata.brands
                    .filter(b => b.toLowerCase().includes(brandSearch.toLowerCase()))
                    .map(brand => (
                      <label key={brand} className="filter-checkbox-label">
                        <input 
                          type="checkbox" 
                          checked={activeFilters.brands.includes(brand)}
                          onChange={() => toggleBrand(brand)}
                        />
                        <span className="text-sm">{brand}</span>
                      </label>
                    ))}
                </div>
              </div>

              <div className="filter-section">
                <div className="filter-title">Categories</div>
                <div className="filter-scroll-area category-scroll">
                  {filterMetadata.categories.map(cat => renderCategory(cat))}
                </div>
              </div>
            </aside>

            {/* PRODUCT LIST */}
            <div className="catalog-content">
              <div className="flex-between mb-16 align-center">
                <div className="flex align-center gap-12">
                  <button 
                    className="filter-toggle-btn" 
                    onClick={() => setIsFilterOpen(!isFilterOpen)}
                    aria-expanded={isFilterOpen}
                    aria-controls="filter-sidebar"
                    aria-label="Toggle filters"
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon>
                    </svg>
                    <span className="filter-toggle-text">Filters</span>
                  </button>
                  <div>
                    <h2 className="m-0">Catalog</h2>
                    <p className="muted tiny">Found {products.length} products</p>
                  </div>
                </div>
                {openStoreId && (
                  <button className="btn" onClick={() => { setOpenStoreId(null); setView("home"); }}>
                    Back to Stores
                  </button>
                )}
              </div>

              {loading ? (
                <div className="flex-center p-16">
                  <span className="spinner"></span>
                  <span className="muted ml-8">Loading products...</span>
                </div>
              ) : (
                <div className="product-grid">
                  {products.length === 0 && (
                    <div className="card text-center p-16 w-full empty-catalog-card">
                      <p className="muted mb-16">No products match your filters.</p>
                      <button className="btn-primary" onClick={resetFilters}>Clear All Filters</button>
                    </div>
                  )}
                  {products.map(p => {
                    const seller = sellers.find(s => s.id === p.sellerId) || { name: "Veloceeo" };
                    const isWishlisted = wishlist.some(wp => wp.id === p.id);
                    return (
                      <div 
                        key={p.id} 
                        className="product-card fade-in"
                        onClick={() => openProductDetails(p)}
                      >
                        <div className="product-card-image-wrapper">
                          <img 
                            src={p.image || "/logo_veloceeo.jpg"} 
                            className="product-card-img" 
                            alt={p.name} 
                            loading="lazy"
                          />
                          <button 
                            className={`wishlist-toggle ${isWishlisted ? 'active' : ''}`}
                            onClick={(e) => { e.stopPropagation(); toggleWishlist(p); }}
                          >
                            {isWishlisted ? "❤️" : "🤍"}
                          </button>
                          {p.stock_quantity <= 0 && <div className="stock-badge out-of-stock">Out of Stock</div>}
                          {p.stock_quantity > 0 && p.stock_quantity < 10 && <div className="stock-badge low-stock">Only {p.stock_quantity} left</div>}
                        </div>
                        <div className="product-card-content">
                          <div className="product-meta-row">
                            <div className="product-brand">{p.brand || seller.name}</div>
                            <div className="product-rating">
                              <span className="rating-badge">
                                {Math.round(p.avgRating || p.average_rating || 4.5)} ★
                              </span>
                            </div>
                          </div>
                          <div className="product-title">{p.name}</div>
                          <div className="product-price-row">
                            <span className="product-price">₹{p.price_cents ? (p.price_cents/100).toLocaleString() : (p.price || 0).toLocaleString()}</span>
                            {p.old_price && <span className="product-old-price">₹{p.old_price}</span>}
                            <span className="product-discount">20% OFF</span>
                          </div>
                          
                          <div className="product-card-action" onClick={e => e.stopPropagation()}>
                            <button 
                              className="btn-primary btn-block btn-xs" 
                              disabled={p.stock_quantity <= 0}
                              onClick={() => addToCart(p, 1)}
                            >
                              {p.stock_quantity > 0 ? "Add to Cart" : "Out of Stock"}
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </section>
        )}

        {/* CART */}
        {view === "cart" && (
          <section className="fade-in">
            <div className="card cart-card">
              <div className="card-header flex-between mb-24">
                <h2 className="m-0">Your Shopping Cart</h2>
                <span className="badge">{cart?.totalItems || 0} Items</span>
              </div>
              
              {!cart || cart.items.length === 0 ? (
                <div className="empty-cart-view">
                  <p className="muted mb-24">Your cart is currently empty.</p>
                  <button className="btn-primary" onClick={() => setView("catalog")}>Browse Products</button>
                </div>
              ) : (
                <div className="cart-container">
                  <div className="cart-items">
                    {cart.items.map(item => {
                      const product = item.product || { name: "Unknown Product", price_cents: 0, image: "" };
                      const unitPrice = product.price_cents ? (product.price_cents / 100) : 0;
                      const subtotal = unitPrice * item.quantity;
                      
                      return (
                        <div key={item.id} className={`cart-item-row ${highlightedItemId === product.id ? 'highlight-item' : ''}`}>
                          <img src={product.image || "/logo_veloceeo.jpg"} className="cart-img" alt={product.name} />
                          <div className="cart-item-info">
                            <div className="product-title">{product.name}</div>
                            <div className="muted small">₹{unitPrice.toLocaleString()} per unit</div>
                          </div>
                          <div className="cart-item-qty">
                            <button className="qty-btn" onClick={() => updateCartQty(item.product_id || product.id, item.quantity - 1)} disabled={loading}>-</button>
                            <span className="qty-val">{item.quantity}</span>
                            <button className="qty-btn" onClick={() => updateCartQty(item.product_id || product.id, item.quantity + 1)} disabled={loading}>+</button>
                          </div>
                          <div className="cart-item-subtotal">
                            ₹{subtotal.toLocaleString()}
                          </div>
                          <button className="btn-icon delete" onClick={() => removeFromCart(item.product_id || product.id)} disabled={loading} title="Remove item">
                            ×
                          </button>
                        </div>
                      );
                    })}
                  </div>
                  
                  <div className="cart-summary-card">
                    <h3>Order Summary</h3>
                    <div className="summary-row">
                      <span>Subtotal ({cart.totalItems} items)</span>
                      <span>₹{(cart.totalPrice / 100).toLocaleString()}</span>
                    </div>
                    <div className="summary-row">
                      <span>Shipping</span>
                      <span className="text-success">FREE</span>
                    </div>
                    <div className="summary-row">
                      <span>Estimated Tax (18% GST)</span>
                      <span>₹{((cart.totalPrice / 100) * 0.18).toLocaleString()}</span>
                    </div>
                    <hr className="divider" />
                    <div className="summary-row total">
                      <span>Grand Total</span>
                      <span>₹{((cart.totalPrice / 100) * 1.18).toLocaleString()}</span>
                    </div>
                    
                    <div className="cart-actions">
                      <button className="btn" onClick={() => clearCart()} disabled={loading}>Clear Cart</button>
                      <button className="btn w-full" onClick={() => setView("catalog")}>Continue Shopping</button>
                      <button className="btn-primary w-full" onClick={() => setView("checkout")}>Proceed to Checkout</button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </section>
        )}

        {/* CHECKOUT */}
        {view === "checkout" && <CheckoutForm totalAmount={(cart.totalPrice / 100)} onPay={(order) => placeOrder(order)} onBack={() => setView("cart")} />}
        
        {/* PRODUCT DETAILS */}
        {view === "product-details" && renderProductDetails()}

        {/* PROFILE EDIT & SETTINGS */}
        {view === "edit-profile" && renderEditProfile()}
        {view === "account-settings" && renderAccountSettings()}

        {/* Product Modal */}
        {renderProductModal()}
      </main>

      <footer className="footer card main-footer">
        © {new Date().getFullYear()} Veloceeo — Promise of Trust, Power of Retail.
      </footer>

      {/* Inline styling block (brand colors) */}
      <style jsx="true">{`
        :root{ --rust:#9B4634; --beige:#F2E8D5; --white:#FFFFFF; --muted:#6b5b54 }
        *{box-sizing:border-box}
        body{margin:0;font-family:Inter,system-ui,Arial;background:var(--beige)}
        .app{min-height:100vh;display:flex;flex-direction:column}
        .header{display:flex;justify-content:space-between;align-items:center;padding:18px 28px;background:var(--rust);color:var(--white);position:sticky;top:0;z-index:900;box-shadow:0 4px 12px rgba(0,0,0,0.15)}
        .header-left{display:flex;gap:12px;align-items:center}
        .logo-header{height:40px;width:40px;object-fit:contain;border-radius:8px;background:var(--white);padding:4px}
        .title{font-weight:700;font-size:20px}
        .subtitle{font-size:12px;opacity:0.9}
        .header-right{display:flex;align-items:center;gap:12px}
        .role-badge{background:rgba(255,255,255,0.08);padding:6px 10px;border-radius:8px;font-size:13px}
        .btn{background:transparent;border:1px solid rgba(0,0,0,0.06);padding:8px 12px;border-radius:8px;cursor:pointer}
        .btn.small{padding:6px 8px}
        .btn-primary{background:var(--rust);color:var(--white);border:none;padding:10px 14px;border-radius:8px;cursor:pointer;font-weight:600}
        .input{padding:10px;border-radius:8px;border:1px solid rgba(0,0,0,0.06);width:100%;background:transparent}
        .container{flex:1;padding:28px;max-width:1150px;margin:0 auto}
        .panel{min-height:100vh;display:flex;align-items:center;justify-content:center;padding:28px}
        
        /* Filter Styles */
        .filter-sidebar {
          padding: 20px;
          background: var(--white);
          border-radius: 12px;
        }
        .filter-group h4 {
          margin: 0 0 10px 0;
          font-size: 14px;
          color: var(--muted);
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .filter-sidebar .input.small {
          padding: 6px 10px;
          font-size: 13px;
        }
        .mt-4 { margin-top: 24px; }
        .mb-2 { margin-bottom: 8px; }
        .py-8 { padding-top: 32px; padding-bottom: 32px; }
        .text-center { text-align: center; }
        .w-full { width: 100%; }

        @media (max-width: 992px) {
          .catalog-section > div {
            flex-direction: column;
          }
          .filter-sidebar {
            width: 100% !important;
            position: static !important;
            margin-bottom: 24px;
          }
        }
        
        .grid-2{display:grid;grid-template-columns:1fr 1fr;gap:20px}
        .card{background:var(--white);padding:18px;border-radius:12px;box-shadow:0 8px 24px rgba(0,0,0,0.06)}
        .muted{color:var(--muted)}
        .small{font-size:0.85rem}
        .tiny{font-size:0.8rem;color:#8b756e}
        .form-row{display:flex;flex-direction:column;gap:10px}
        .list{list-style:none;padding:0;margin:0;display:flex;flex-direction:column;gap:10px}
        .list-item{display:flex;justify-content:space-between;align-items:center;padding:10px;border-radius:8px;background:linear-gradient(180deg, rgba(255,255,255,0.02), rgba(0,0,0,0.02))}
        .grid-products{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:12px;margin-top:12px}
        .product-card{background:var(--beige);border-radius:10px;overflow:hidden;display:flex;flex-direction:column;align-items:stretch}
        .product-img{width:100%;height:140px;object-fit:cover;background:var(--white)}
        .product-body{padding:10px}
        .grid-products-wide{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:12px;margin-top:14px}
        .product-card-wide{display:flex;background:var(--white);border-radius:10px;overflow:hidden}
        .product-img-wide{width:160px;height:160px;object-fit:cover;background:var(--beige)}
        .product-body-wide{padding:12px;flex:1}
        .cart-card { max-width: 1000px; margin: 0 auto; }
        .cart-container { display: flex; gap: 30px; margin-top: 20px; }
        .cart-items { flex: 1; }
        .cart-item-row { display: flex; align-items: center; gap: 15px; padding: 15px 0; border-bottom: 1px solid #eee; }
        .cart-item-info { flex: 1; }
        .cart-item-qty { display: flex; align-items: center; gap: 10px; background: #f8f8f8; padding: 4px 8px; border-radius: 20px; }
        .qty-btn { border: none; background: none; font-size: 18px; cursor: pointer; width: 24px; color: var(--rust); }
        .qty-val { font-weight: 600; min-width: 20px; text-align: center; }
        .cart-item-subtotal { font-weight: 600; min-width: 80px; text-align: right; }
        .cart-summary-card { width: 320px; background: #fcfcfc; padding: 20px; border-radius: 12px; height: fit-content; border: 1px solid #eee; }
        .summary-row { display: flex; justify-content: space-between; margin-bottom: 12px; }
        .summary-row.total { font-weight: 700; font-size: 18px; color: var(--rust); margin-top: 10px; }
        .cart-actions { display: flex; flex-direction: column; gap: 10px; margin-top: 20px; }
        .divider { border: 0; border-top: 1px solid #eee; margin: 15px 0; }
        .badge { background: var(--rust); color: white; padding: 2px 8px; border-radius: 12px; font-size: 12px; }
        .btn-icon.delete { color: #cc0000; font-size: 20px; background: none; border: none; cursor: pointer; padding: 0 5px; }
        .text-success { color: #28a745; font-weight: 600; }

        /* Toast & Animations moved to index.css */
        
        .cart-count-badge {
          position: absolute;
          top: -8px;
          right: -8px;
          background: var(--rust);
          color: white;
          font-size: 10px;
          padding: 2px 6px;
          border-radius: 10px;
          font-weight: bold;
          border: 2px solid white;
        }

        .highlight-item {
          animation: highlightFlash 2s ease-out;
          background: rgba(155, 70, 52, 0.05);
        }

        @keyframes highlightFlash {
          0% { background: rgba(155, 70, 52, 0.2); }
          100% { background: transparent; }
        }

        @media (max-width: 768px) {
          .cart-card { padding: 12px; }
          .cart-container { flex-direction: column; gap: 20px; }
          .cart-summary-card { width: 100%; order: 2; padding: 16px; }
          .cart-items { order: 1; }
          .cart-item-row { 
            position: relative;
            align-items: flex-start;
            padding: 12px 0;
            gap: 12px;
          }
          .cart-img { width: 80px; height: 80px; }
          .cart-item-info { 
            padding-right: 35px; 
            flex: 1;
          }
          .cart-item-info .product-title { font-size: 14px; margin-bottom: 4px; }
          .cart-item-qty { 
            margin-top: 8px;
            width: fit-content;
            padding: 2px 6px;
            position: relative;
            z-index: 1;
          }
          .qty-btn { width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; font-size: 20px; }
          .cart-item-subtotal { 
            position: absolute;
            bottom: 12px;
            right: 0;
            font-size: 15px;
          }
          .btn-icon.delete { 
            position: absolute;
            top: 0;
            right: -10px;
            width: 44px;
            height: 44px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 24px;
            z-index: 2;
          }
        }

        @media (max-width: 480px) {
          .cart-item-row { gap: 10px; }
          .cart-img { width: 70px; height: 70px; }
          .cart-item-info .product-title { font-size: 13px; }
          .cart-item-subtotal { font-size: 14px; }
          .card-header h2 { font-size: 18px; }
          .summary-row.total { font-size: 16px; }
          .cart-actions .btn { padding: 12px; font-size: 14px; }
        }
        .cart-img{width:72px;height:72px;object-fit:cover;border-radius:6px}
        .cart-body{flex:1}
        .cart-footer{display:flex;justify-content:space-between;align-items:center;margin-top:12px;gap:12px}
        .filters{display:flex;gap:12px;margin-bottom:12px;align-items:center}
        @media (max-width:900px){ 
          .login-container { flex-direction: column; max-width: 500px; margin: 20px; }
          .login-brand { padding: 40px 30px; text-align: center; align-items: center; }
          .login-brand-title { font-size: 28px; }
          .brand-features { display: none; }
          .login-auth-card { padding: 40px 30px; }
          .grid-2{grid-template-columns:1fr} 
          .product-img-wide{width:120px;height:120px} 
          .header{padding:12px 14px} 
          .container{padding:18px} 
        }
        @media (max-width:480px) {
          .form-grid { grid-template-columns: 1fr; }
          .login-auth-card { padding: 20px; }
        }

        /* Review System Styles */
        .reviews-section { margin-top: 60px; border-top: 1px solid #eee; padding-top: 40px; }
        .reviews-header-row { display: flex; justify-content: space-between; alignItems: center; margin-bottom: 32px; }
        .section-title { font-size: 24px; font-weight: 700; margin: 0; color: #1a1a1a; }
        .rating-badge-large { display: flex; align-items: center; gap: 12px; background: #fff9e6; padding: 8px 16px; border-radius: 12px; }
        .rating-badge-large .score { font-size: 28px; font-weight: 800; color: #1a1a1a; }
        .rating-badge-large .stars-large { color: #FFD700; font-size: 24px; letter-spacing: 2px; }
        .rating-badge-large .count { color: #666; font-size: 14px; font-weight: 500; }

        .reviews-layout { display: grid; grid-template-columns: 320px 1fr; gap: 40px; align-items: flex-start; }
        .review-sidebar { display: flex; flex-direction: column; gap: 24px; }
        
        .review-stats-card { padding: 24px; border: 1px solid #eee; box-shadow: 0 4px 12px rgba(0,0,0,0.03); }
        .card-title { font-size: 18px; font-weight: 700; margin: 0 0 16px 0; color: #333; }
        .dist-row { display: flex; align-items: center; gap: 12px; margin-bottom: 8px; font-size: 14px; }
        .star-num { min-width: 30px; font-weight: 600; color: #555; }
        .dist-bar { flex: 1; height: 8px; background: #f0f0f0; border-radius: 4px; overflow: hidden; }
        .dist-fill { height: 100%; background: #FFD700; border-radius: 4px; }
        .dist-count { min-width: 24px; text-align: right; color: #999; font-size: 13px; }

        .write-review-card { padding: 24px; border: 1px solid #e0e0e0; background: #fff; }
        .sticky-card { position: sticky; top: 100px; }
        .star-input { display: flex; gap: 8px; font-size: 28px; color: #e0e0e0; cursor: pointer; transition: color 0.2s; }
        .star-input span:hover, .star-input span.active { color: #FFD700; transform: scale(1.1); }
        .photo-upload-grid { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 8px; }
        .photo-preview { position: relative; width: 64px; height: 64px; border-radius: 8px; overflow: hidden; border: 1px solid #eee; }
        .photo-preview img { width: 100%; height: 100%; object-fit: cover; }
        .photo-actions {
          position: absolute;
          top: 0; left: 0; right: 0; bottom: 0;
          background: rgba(0,0,0,0.3);
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          opacity: 0;
          transition: opacity 0.2s;
        }
        .photo-preview:hover .photo-actions {
          opacity: 1;
        }
        .primary-photo {
          border: 2px solid var(--rust) !important;
        }
        .set-primary-btn {
          background: white;
          border: none;
          border-radius: 50%;
          width: 24px;
          height: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          font-size: 14px;
          color: #FFD700;
        }
        .remove-photo-btn {
          background: rgba(220, 53, 69, 0.9);
          color: white;
          border: none;
          border-radius: 50%;
          width: 24px;
          height: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          font-size: 16px;
        }
        .move-photo-btn {
          background: rgba(255, 255, 255, 0.9);
          color: #333;
          border: none;
          border-radius: 50%;
          width: 24px;
          height: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          font-size: 14px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .move-photo-btn:hover {
          background: #fff;
          transform: scale(1.1);
        }
        .login-prompt-card { padding: 24px; text-align: center; background: #f9f9f9; border: 1px dashed #ddd; }

        .reviews-filter-bar { display: flex; justify-content: space-between; alignItems: center; margin-bottom: 20px; padding-bottom: 16px; border-bottom: 1px solid #f0f0f0; }
        .sort-control { display: flex; align-items: center; gap: 10px; }
        .empty-reviews-state { padding: 40px; text-align: center; background: #fcfcfc; border: 1px dashed #ddd; border-radius: 12px; }

        .review-card { padding: 24px; margin-bottom: 20px; border: 1px solid #f0f0f0; transition: transform 0.2s, box-shadow 0.2s; }
        .review-card:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(0,0,0,0.06); }
        .review-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px; }
        .reviewer-info { display: flex; align-items: center; gap: 12px; }
        .avatar-circle { width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 700; color: #333; font-size: 16px; }
        .reviewer-name { font-weight: 600; color: #1a1a1a; font-size: 15px; }
        .review-stars { color: #FFD700; font-size: 16px; letter-spacing: 1px; }
        .review-title { font-size: 16px; font-weight: 700; margin: 0 0 8px 0; color: #111; }
        .review-text { line-height: 1.6; color: #444; margin: 0 0 16px 0; font-size: 15px; }
        .review-photos-grid { display: flex; gap: 10px; flex-wrap: wrap; margin-bottom: 16px; }
        .review-photos-grid img { width: 80px; height: 80px; object-fit: cover; border-radius: 8px; cursor: zoom-in; border: 1px solid #eee; transition: transform 0.2s; }
        .review-photos-grid img:hover { transform: scale(1.05); }
        .review-actions { display: flex; justify-content: flex-end; gap: 20px; border-top: 1px solid #f9f9f9; paddingTop: 12px; }
        .btn-link.danger { color: #999; }
        .btn-link.danger:hover { color: #dc3545; }
        .pagination { display: flex; gap: 8px; justify-content: center; margin-top: 32px; }

        .product-details-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-bottom: 40px; }
        .product-details-image img { width: 100%; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
        .brand-label { color: var(--rust); text-transform: uppercase; font-weight: 700; font-size: 14px; letter-spacing: 1px; margin-bottom: 12px; }
        .input-hint.error { color: #d32f2f; }

        @media (max-width: 992px) {
          .product-details-grid, .reviews-layout {
            grid-template-columns: 1fr;
          }
          .review-sidebar {
            position: static !important;
            margin-bottom: 32px;
          }
          .reviews-header-row { flex-direction: column; align-items: flex-start; gap: 16px; }
          .sticky-card { position: static; }
        }
      `}</style>
    </div>
  );
}

/* Checkout form component */
function CheckoutForm({ totalAmount, onPay, onBack }) {
  const [customer, setCustomer] = useState({ name: "", phone: "", address: "", pincode: "" });
  return (
    <div className="card checkout-card mx-auto">
      <h2 className="mb-24">Checkout</h2>
      <div className="grid gap-12">
        <div className="form-group">
          <label className="label">Full Name</label>
          <input className="input" placeholder="Customer name" value={customer.name} onChange={(e) => setCustomer({ ...customer, name: e.target.value })} />
        </div>
        <div className="form-group">
          <label className="label">Contact Number</label>
          <input className="input" placeholder="Phone" value={customer.phone} onChange={(e) => setCustomer({ ...customer, phone: e.target.value })} />
        </div>
        <div className="grid-2 gap-12">
          <div className="form-group">
            <label className="label">Pincode</label>
            <input className="input" placeholder="Pincode" value={customer.pincode} onChange={(e) => setCustomer({ ...customer, pincode: e.target.value })} />
          </div>
          <div className="form-group">
            <label className="label">Address Details</label>
            <input className="input" placeholder="Full delivery address" value={customer.address} onChange={(e) => setCustomer({ ...customer, address: e.target.value })} />
          </div>
        </div>
      </div>

      <div className="flex-between mt-24 pt-24 border-top">
        <div>
          <div className="muted small">Payable amount (incl. GST)</div>
          <div className="text-lg bold">₹{(totalAmount * 1.18).toLocaleString()}</div>
        </div>
        <div className="flex gap-12">
          <button className="btn" onClick={onBack}>Back</button>
          <button className="btn-primary" onClick={() => onPay({ amount: totalAmount * 1.18, customer })}>Pay with Razorpay</button>
        </div>
      </div>

      <div className="mt-16 muted tiny text-center">Note: this is a client-side Razorpay demo; backend order creation & webhook verification required for production.</div>
    </div>
  );
}