// src/api/payment/payment.routes.ts
import express from 'express';
import * as controller from './payment.controller';
import { protect } from '../../middleware/auth.middleware';
 

const router = express.Router();

// create order (public or protected depending on design)
// often checkout will be an authenticated customer, but adapt to your auth flow


// webhook: usually does NOT require JWT (but must verify signature)
router.post('/webhook', express.raw({ type: 'application/json' }), controller.razorpayWebhook);

// admin/seller views — protected
router.get('/', protect, controller.listPayments);
router.get('/:id', protect, controller.getPaymentById);

export default router;
