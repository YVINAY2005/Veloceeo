import express from 'express';
import * as controller from './auth.controller';
import { protect } from '../../middleware/auth.middleware';

const router = express.Router();

router.get('/me', protect, controller.getMe);

export default router;
