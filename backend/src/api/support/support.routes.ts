// // src/api/support/support.routes.ts
// import { Router } from 'express';
// import * as supportController from './support.controller';

// const router = Router();

// router.post('/tickets', supportController.createSupportTicket);
// router.get('/tickets', supportController.getSupportTickets);
// router.get('/tickets/:id', supportController.getTicketById);
// //... add other routes here

// export default router;
import express from 'express';
import * as controller from './support.controller';
import { protect, restrictTo } from '../../middleware/auth.middleware';
import { validateCreateTicket, validateMessage, validateStatusUpdate } from './support.validation';

const router = express.Router();

// Auth required for all
router.use(protect);

// Create a new support ticket
router.post('/', validateCreateTicket, controller.createTicket);

// Add a conversation message
router.post('/:ticketId/message', validateMessage, controller.addMessage);

// Get all tickets (role-based)
router.get('/', controller.listTickets);

// Get ticket by ID
router.get('/:id', controller.getTicketById);

// Update status (admin or seller)
router.patch('/:id/status', restrictTo('admin', 'seller'), validateStatusUpdate, controller.updateStatus);

// Delete a ticket (admin only)
router.delete('/:id', restrictTo('admin'), controller.deleteTicket);

export default router;
