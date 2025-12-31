import express from 'express';
import * as bankController from './bank.controller';
import { protect, restrictTo } from '../../middleware/auth.middleware';
import { validateBank } from './bank.validation';

const router = express.Router();

// Apply auth + role restriction once
router.use(protect, restrictTo('seller'));

// Add bank account
router.post('/', validateBank, bankController.addBankAccount);

// Get all bank accounts of the seller
router.get('/', bankController.getBankAccounts);

// Get primary bank account
router.get('/primary', bankController.getPrimaryBank);

// Get a single bank account by ID
router.get('/:id', bankController.getBankAccount);

// Update account
router.patch('/:id', validateBank, bankController.updateBankAccount);

// Delete account
router.delete('/:id', bankController.deleteBankAccount);

export default router;
