import express from 'express';
import Controller from './OrderController.js';
import { requireAuth } from '../../../middlewares/auth.js';

const router = express.Router();

router.get('/', requireAuth, Controller.getOrders);
router.post('/', requireAuth, Controller.createOrder);
router.patch('/:id', requireAuth, Controller.updateOrderStatus);

export default router;
