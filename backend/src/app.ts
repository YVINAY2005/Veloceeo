// src/app.ts
import express, { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { errorHandler } from './middleware/errorHandler';
import AppError from './utils/AppError';

// --- Import Routers ---
import notificationRoutes from './api/notification/notification.routes';
import authRoutes from './api/auth/auth.routes';
import adminRouter from './api/admin/admin.routes';
import supportRouter from './api/support/support.routes';
import storeRouter from './api/store/store.routes';
import cartRouter from './api/cart/cart.routes';
import productRouter from './api/product/product.routes';
import customerRoutes from './api/customer/customer.routes';
import sellerRoutes from './api/seller/seller.routes';
import paymentRoutes from './api/payment/payment.routes';
import bankRoutes from './api/bank/bank.routes';
import reviewRoutes from './api/review/review.routes';

const app = express();
const API_PREFIX = '/api/v1';

// ---------- Security & performance middlewares ----------
app.use(helmet());
app.use(compression());

// ---------- CORS ----------
// allow comma-separated origins via env CORS_ORIGIN
const allowedOriginEnv = process.env.CORS_ORIGIN || 'http://localhost:5173';
const allowedOrigins = allowedOriginEnv.split(',').map(s => s.trim()).filter(Boolean);
const devAllowLocalhost = (origin?: string) => !!origin && /^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin);

app.use(cors({
  origin: (origin, callback) => {
    // allow requests with no origin (curl, server-to-server)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin) || devAllowLocalhost(origin)) return callback(null, true);
    
    console.log(`🚫 CORS Blocked: origin=${origin}`);
    return callback(new Error('CORS policy: origin not allowed'), false);
  },
  credentials: true,
}));

// ---------- Body parsing & Cookies ----------
// Debug logger for all requests
app.use((req: Request, res: Response, next: NextFunction) => {
  const originalSend = res.send;
  res.send = function(body) {
    if (res.statusCode === 403) {
      console.log(`🚫 403 Forbidden Response sent for ${req.method} ${req.originalUrl}`);
      console.log(`Headers:`, JSON.stringify(req.headers, null, 2));
    }
    return originalSend.call(this, body);
  };
  next();
});

app.use(cookieParser());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ---------- Optional: trust proxy if behind LB (set TRUST_PROXY=true in prod env) ----------
if (process.env.TRUST_PROXY === 'true') {
  app.set('trust proxy', 1);
}

// --- Request Debug Logger (optional) ---
app.use((req: Request, _res: Response, next: NextFunction) => {
  console.log(`📨 ${req.method} ${req.originalUrl}`);
  next();
});

// --- Optional CSRF protection (double-submit cookie) ---
if (process.env.ENABLE_CSRF === 'true') {
  app.use((req: Request, _res: Response, next: NextFunction) => {
    if (req.method === 'GET' || req.method === 'HEAD') return next();
    const header = req.headers['x-csrf-token'];
    if (!header) return next(new AppError('Missing CSRF token', 403));
    return next();
  });
}

// --- Rate limiter (applies to /api routes) ---
const apiLimiter = rateLimit({
  windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS || 15 * 60 * 1000), // default 15 minutes
  max: Number(process.env.RATE_LIMIT_MAX || 100), // default 100 requests per window
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(API_PREFIX, apiLimiter);

// --- Simple caching headers for GET endpoints ---
app.use((req: Request, res: Response, next: NextFunction) => {
  if (req.method === 'GET') {
    // Only cache public routes, others should be private/no-store
    const isPublicProduct = req.path.startsWith(`${API_PREFIX}/product`) || req.path.startsWith('/api/product');
    const isPublicStore = req.path.startsWith(`${API_PREFIX}/store`) || req.path.startsWith('/api/store');
    
    if ((isPublicProduct || isPublicStore) && !req.headers.authorization) {
      res.set('Cache-Control', 'public, max-age=60, stale-while-revalidate=300');
    } else {
      res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    }
  } else {
    res.set('Cache-Control', 'no-store');
  }
  next();
});

// --- API Routes (versioned) ---
app.use(`${API_PREFIX}/auth`, authRoutes);
app.use(`${API_PREFIX}/customer`, customerRoutes);
app.use(`${API_PREFIX}/admin`, adminRouter);
app.use(`${API_PREFIX}/support`, supportRouter);
app.use(`${API_PREFIX}/store`, storeRouter);
app.use(`${API_PREFIX}/cart`, cartRouter);
app.use(`${API_PREFIX}/product`, productRouter);
app.use(`${API_PREFIX}/bank`, bankRoutes);
app.use(`${API_PREFIX}/seller`, sellerRoutes);
app.use(`${API_PREFIX}/payments`, paymentRoutes);
app.use(`${API_PREFIX}/notifications`, notificationRoutes);
app.use(`${API_PREFIX}/reviews`, reviewRoutes);

// --- Legacy mounts (backward compatibility) ---
// (Legacy mounts are deprecated and will be removed in future versions)
app.use('/api/auth', authRoutes);
app.use('/api/customer', customerRoutes);
app.use('/api/admin', adminRouter);
app.use('/api/support', supportRouter);
app.use('/api/store', storeRouter);
app.use('/api/cart', cartRouter);
app.use('/api/product', productRouter);
app.use('/api/bank', bankRoutes);
app.use('/api/seller', sellerRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/orders', customerRoutes); // Orders are handled within customer routes in this version

// --- OpenAPI JSON (minimal) ---
app.get(`${API_PREFIX}/openapi.json`, (_req: Request, res: Response) => {
  const spec = {
    openapi: '3.0.0',
    info: { title: 'Veleco API', version: '1.0.0' },
    servers: [{ url: API_PREFIX }],
    paths: {
      '/customer/signup': { post: { summary: 'Customer signup' } },
      '/customer/login': { post: { summary: 'Customer login' } },
      '/customer/logout': { post: { summary: 'Logout' } },
      '/customer/me': { get: { summary: 'Get profile' }, patch: { summary: 'Update profile' } },
      '/customer/orders/create': { post: { summary: 'Create order' } },
      '/customer/orders/{id}': { get: { summary: 'Get order' } },
      '/seller/signup': { post: { summary: 'Seller signup' } },
      '/seller/login': { post: { summary: 'Seller login' } },
      '/seller/logout': { post: { summary: 'Logout' } },
      '/seller/stores': { get: { summary: 'List my stores' }, post: { summary: 'Create store' } },
      '/seller/products': { get: { summary: 'List my products' }, post: { summary: 'Create product' } },
      '/seller/products/{id}': { patch: { summary: 'Update product' }, delete: { summary: 'Delete product' } },
      '/product/search': { get: { summary: 'Search products' } },
      '/product/store/{storeId}': { get: { summary: 'List store products' } },
      '/product/{id}': { get: { summary: 'Get product' } },
      '/store/public': { get: { summary: 'List public stores' } },
      '/cart': { get: { summary: 'Get cart' } },
      '/cart/add': { post: { summary: 'Add to cart' } },
      '/cart/clear': { delete: { summary: 'Clear cart' } },
      '/payments': { get: { summary: 'List payments' } },
      '/payments/{id}': { get: { summary: 'Get payment by ID' } },
      '/admin/login': { post: { summary: 'Admin login' } },
      '/admin/sellers': { get: { summary: 'List sellers' }, post: { summary: 'Create seller' } },
    },
  };
  res.json(spec);
});

// Health check endpoint (useful for LB / container health)
app.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({ status: 'ok', time: new Date().toISOString() });
});

// --- Route Debug Info (dev only) ---
if (process.env.NODE_ENV !== 'production') {
  console.log('✅ Mounted routers:');
  // Express internal _router property is not typed in @types/express
  const internalApp = app as unknown as { _router: { stack: Array<{ name: string; regexp: string }> } };
  const routerLayers = internalApp._router.stack;
  routerLayers
    .filter((layer) => layer.name === 'router')
    .forEach((layer) => console.log('🔹 Router mounted at:', layer.regexp));
}

// --- 404 Handler ---
app.all('*', (req: Request, _res: Response, next: NextFunction) => {
  console.log(`❌ 404: ${req.method} ${req.originalUrl}`);
  next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
});

// --- Global Error Handler ---
app.use(errorHandler);

export default app;
