export type Review = {
  id: number;
  product_id: number;
  customer_id: number;
  order_id: number | null;
  rating: number;
  review_text: string | null;
  created_at: Date;
  updated_at: Date;
};

export type Product = {
  id: number;
  store_id: number;
  category_id: number | null;
  name: string;
  slug: string;
  sku: string;
  description: string | null;
  price_cents: number;
  currency: string;
  stock_quantity: number;
  brand: string | null;
  is_active: boolean;
  image: string | null;
  averageRating: number;
  totalRatings: number;
  ratingBreakdown: {
    '1': number;
    '2': number;
    '3': number;
    '4': number;
    '5': number;
  };
  created_at: Date;
  updated_at: Date;
};
