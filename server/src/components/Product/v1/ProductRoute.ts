import express from 'express';
import Controller from './ProductController.js';
import { requireAuth } from '../../../middlewares/auth.js';

const router = express.Router();

router.get('/', Controller.getProducts);
router.post('/', requireAuth, Controller.createProduct);
router.patch('/:id', requireAuth, Controller.updateProductStatus);

export default router;
