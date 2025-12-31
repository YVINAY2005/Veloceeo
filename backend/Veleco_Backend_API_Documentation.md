# 🚀 Veleco Backend API Documentation

> A comprehensive guide to the Veleco Backend API - built with Node.js, TypeScript, Express, and Prisma

---

## 📋 Table of Contents

- [Overview](#overview)
- [Project Structure](#project-structure)
- [Technologies](#technologies)
- [Installation](#installation)
- [API Endpoints](#api-endpoints)
  - [Admin](#admin-endpoints)
  - [Bank](#bank-endpoints)
  - [Cart](#cart-endpoints)
  - [Customer](#customer-endpoints)
  - [Notification](#notification-endpoints)
  - [Payment](#payment-endpoints)
  - [Product](#product-endpoints)
  - [Seller](#seller-endpoints)
  - [Store](#store-endpoints)
  - [Support](#support-endpoints)

---

## 🎯 Overview

The Veleco Backend API is a robust e-commerce platform backend built with modern Node.js technologies. It provides comprehensive endpoints for managing admins, sellers, customers, products, stores, payments, and support tickets.

**Key Features:**
- 🔐 JWT-based authentication
- 👥 Role-based access control (Admin, Seller, Customer)
- 💳 Razorpay payment gateway integration
- 📧 Email notifications via Nodemailer
- 🛡️ Rate limiting and security headers
- 🗄️ Prisma ORM for type-safe database access

---

## 📁 Project Structure

```
src/api
├── admin
│   ├── admin.controller.ts
│   ├── admin.routes.ts
│   ├── admin.service.ts
│   └── admin.validation.ts
├── bank
│   ├── bank.controller.ts
│   ├── bank.routes.ts
│   ├── bank.service.ts
│   └── bank.validation.ts
├── cart
│   ├── cart.controller.ts
│   ├── cart.routes.ts
│   ├── cart.service.ts
│   └── cart.validation.ts
├── customer
│   ├── customer.controller.ts
│   ├── customer.routes.ts
│   ├── customer.service.ts
│   └── customer.validation.ts
├── notification
│   ├── notification.controller.ts
│   ├── notification.routes.ts
│   └── notification.service.ts
├── payment
│   ├── payment.controller.ts
│   ├── payment.routes.ts
│   ├── payment.service.ts
│   └── payment.validation.ts
├── product
│   ├── product.controller.ts
│   ├── product.routes.ts
│   ├── product.service.ts
│   └── product.validation.ts
├── seller
│   ├── seller.controller.ts
│   ├── seller.routes.ts
│   ├── seller.service.ts
│   └── seller.validation.ts
├── store
│   ├── store.controller.ts
│   ├── store.routes.ts
│   ├── store.service.ts
│   └── store.validation.ts
└── support
    ├── support.controller.ts
    ├── support.routes.ts
    ├── support.service.ts
    └── support.validation.ts
```

---

## 🛠️ Technologies

### Core Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| `express` | Latest | Web framework |
| `typescript` | Latest | Type safety |
| `@prisma/client` | Latest | Database ORM |
| `jsonwebtoken` | Latest | Authentication |
| `bcryptjs` | Latest | Password hashing |
| `zod` | Latest | Schema validation |
| `razorpay` | Latest | Payment gateway |
| `nodemailer` | Latest | Email service |
| `helmet` | Latest | Security headers |
| `cors` | Latest | CORS middleware |
| `express-rate-limit` | Latest | Rate limiting |
| `dotenv` | Latest | Environment variables |
| `uuid` | Latest | Unique ID generation |

### Development Dependencies

- `@types/*` - TypeScript type definitions
- `prisma` - Prisma CLI and migrations
- `ts-node` - TypeScript execution
- `nodemon` - Development server with hot reload

---

## 🚀 Installation

### Prerequisites

Ensure you have the following installed:
- **Node.js** (LTS version recommended)
- **npm** or **yarn**
- **Database** (PostgreSQL)

### Setup Steps

**1. Clone the repository**
```bash
git clone <repository-url>
cd veloceeo_testing/veleco_backend_i1yfc0
```

**2. Install dependencies**
```bash
npm install
# or
yarn install
```


**3. Configure environment variables**

Create a `.env` file in the root directory:

```env
# Database
DATABASE_URL="postgresql://user:password@host:port/database"

# Authentication
JWT_SECRET="your_jwt_secret_key"

# Environment
NODE_ENV="development"

# Razorpay (Optional)
RAZORPAY_KEY_ID="your_razorpay_key"
RAZORPAY_KEY_SECRET="your_razorpay_secret"

# Email (Optional)
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_USER="your_email@gmail.com"
SMTP_PASS="your_email_password"
```

**4. Set up Prisma**

Generate Prisma client:
```bash
npx prisma generate
```

Run database migrations:
```bash
npx prisma migrate dev --name init
```

npm install --save-dev @types/compression(run in backend folder )
**5. Start the application**

Development mode (with hot reload):
```bash
npm run dev
```

Production mode:
```bash
npm run build
npm start
```

### ⚡ Important: Prisma Import Pattern

For optimal Vercel performance, always import Prisma using the singleton pattern:

```typescript
// ✅ CORRECT
import prisma from "../../lib/prisma";

// ❌ AVOID
import { PrismaClient } from "../../db/generated/prisma";
```

---

## 📡 API Endpoints

### 🔑 Authentication & Authorization

| Icon | Meaning |
|------|---------|
| 🌐 | Public endpoint |
| 🔒 | Protected endpoint (requires JWT) |
| 👤 | Role-based access |

---

### 👨‍💼 Admin Endpoints

**Base Path:** `/api/admin`

| Method | Endpoint | Description | Auth | Role |
|--------|----------|-------------|------|------|
| `POST` | `/signup` | Register new admin | 🌐 | - |
| `POST` | `/login` | Admin login | 🌐 | - |
| `POST` | `/logout` | Admin logout | 🔒 | Admin |
| `POST` | `/sellers` | Create seller account | 🔒 | Admin |
| `GET` | `/sellers` | List all sellers | 🔒 | Admin |
| `GET` | `/sellers/:id` | Get seller details | 🔒 | Admin |
| `PATCH` | `/sellers/:id` | Update seller | 🔒 | Admin |
| `DELETE` | `/sellers/:id` | Delete seller | 🔒 | Admin |
| `GET` | `/analytics` | Get analytics data | 🔒 | Admin |
| `GET` | `/orders` | List all orders | 🔒 | Admin |

---

### 🏦 Bank Endpoints

**Base Path:** `/api/bank`

| Method | Endpoint | Description | Auth | Role |
|--------|----------|-------------|------|------|
| `POST` | `/` | Add bank account | 🔒 | Seller |
| `GET` | `/` | List bank accounts | 🔒 | Seller |
| `GET` | `/primary` | Get primary account | 🔒 | Seller |
| `GET` | `/:id` | Get bank account | 🔒 | Seller |
| `PATCH` | `/:id` | Update bank account | 🔒 | Seller |
| `DELETE` | `/:id` | Delete bank account | 🔒 | Seller |

---

### 🛒 Cart Endpoints

**Base Path:** `/api/cart`

| Method | Endpoint | Description | Auth | Role |
|--------|----------|-------------|------|------|
| `POST` | `/add` | Add item to cart | 🔒 | Customer |
| `GET` | `/` | Get cart contents | 🔒 | Customer |
| `DELETE` | `/clear` | Clear cart | 🔒 | Customer |

---

### 👥 Customer Endpoints

**Base Path:** `/api/customer`

| Method | Endpoint | Description | Auth | Role |
|--------|----------|-------------|------|------|
| `POST` | `/signup` | Register customer | 🌐 | - |
| `POST` | `/login` | Customer login | 🌐 | - |
| `POST` | `/logout` | Customer logout | 🔒 | Customer |
| `GET` | `/me` | Get profile | 🔒 | Customer |
| `PATCH` | `/me` | Update profile | 🔒 | Customer |
| `POST` | `/orders/create` | Create order | 🔒 | Customer |
| `GET` | `/orders/:id` | Get order details | 🔒 | Customer |

---

### 🔔 Notification Endpoints

**Base Path:** `/api/notification`

| Method | Endpoint | Description | Auth | Role |
|--------|----------|-------------|------|------|
| `POST` | `/` | Create notification | 🔒 | Admin/Seller |
| `GET` | `/` | List notifications | 🔒 | All |
| `PATCH` | `/:id/read` | Mark as read | 🔒 | All |
| `PATCH` | `/read-all` | Mark all as read | 🔒 | All |

---

### 💳 Payment Endpoints

**Base Path:** `/api/payment`

| Method | Endpoint | Description | Auth | Role |
|--------|----------|-------------|------|------|
| `POST` | `/webhook` | Razorpay webhook | 🌐 | - |
| `GET` | `/` | List payments | 🔒 | Admin/Seller |
| `GET` | `/:id` | Get payment details | 🔒 | Admin/Seller |

---

### 📦 Product Endpoints

**Base Path:** `/api/product`

| Method | Endpoint | Description | Auth | Role |
|--------|----------|-------------|------|------|
| `GET` | `/search` | Search products | 🌐 | - |
| `GET` | `/store/:storeId` | Get store products | 🌐 | - |
| `GET` | `/:id` | Get product details | 🌐 | - |
| `POST` | `/` | Create product | 🔒 | Seller/Admin |
| `PATCH` | `/:id` | Update product | 🔒 | Seller/Admin |
| `PATCH` | `/:id/stock` | Update stock | 🔒 | Seller/Admin |
| `DELETE` | `/:id` | Delete product | 🔒 | Seller/Admin |

---

### 🏪 Seller Endpoints

**Base Path:** `/api/seller`

| Method | Endpoint | Description | Auth | Role |
|--------|----------|-------------|------|------|
| `POST` | `/signup` | Register seller | 🌐 | - |
| `POST` | `/login` | Seller login | 🌐 | - |
| `POST` | `/logout` | Seller logout | 🔒 | Seller |
| `POST` | `/stores` | Create store | 🔒 | Seller |
| `GET` | `/stores` | List stores | 🔒 | Seller |
| `POST` | `/products` | Create product | 🔒 | Seller |
| `GET` | `/products` | List products | 🔒 | Seller |
| `PATCH` | `/products/:id` | Update product | 🔒 | Seller |
| `DELETE` | `/products/:id` | Delete product | 🔒 | Seller |
| `GET` | `/payments` | List payments | 🔒 | Seller |

---

### 🏬 Store Endpoints

**Base Path:** `/api/store`

| Method | Endpoint | Description | Auth | Role |
|--------|----------|-------------|------|------|
| `POST` | `/` | Create store | 🔒 | Seller |
| `GET` | `/` | List seller stores | 🔒 | Seller |
| `GET` | `/:id` | Get store details | 🔒 | Seller |
| `PATCH` | `/:id` | Update store | 🔒 | Seller |
| `DELETE` | `/:id` | Delete store | 🔒 | Seller |

---

### 🎫 Support Endpoints

**Base Path:** `/api/support`

| Method | Endpoint | Description | Auth | Role |
|--------|----------|-------------|------|------|
| `POST` | `/` | Create ticket | 🔒 | All |
| `POST` | `/:ticketId/message` | Add message | 🔒 | All |
| `GET` | `/` | List tickets | 🔒 | All |
| `GET` | `/:id` | Get ticket details | 🔒 | All |
| `PATCH` | `/:id/status` | Update status | 🔒 | Admin/Seller |
| `DELETE` | `/:id` | Delete ticket | 🔒 | Admin |

---

## 📝 Notes

- All protected endpoints require a valid JWT token in the `Authorization` header: `Bearer <token>`
- Responses follow standard REST conventions with appropriate HTTP status codes
- Validation is handled using Zod schemas for type safety
- Database operations use Prisma ORM for type-safe queries
- Payment webhooks are verified using Razorpay signature validation

---

## 📄 License

This project is proprietary software. All rights reserved.

---

**Built with ❤️ using Node.js, TypeScript, Express, and Prisma**