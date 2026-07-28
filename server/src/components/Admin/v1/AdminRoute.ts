import express from 'express';
import Controller from './AdminController.js';
import { requireAuth } from '../../../middlewares/auth.js';
import { User } from '../../index.js';

const router = express.Router();

const requireAdmin = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const user = req.user as User;
  if (!user || user.role !== 'admin') {
    return res.status(403).json({ error: 'Access denied. Administrative privileges required.' });
  }
  next();
};

router.get('/users', requireAuth, requireAdmin, Controller.getUsers);
router.patch('/users/:id/verify', requireAuth, requireAdmin, Controller.verifyUser);
router.get('/products/pending', requireAuth, requireAdmin, Controller.getPendingProducts);
router.get('/products', requireAuth, requireAdmin, Controller.getAdminProducts);
router.get('/orders', requireAuth, requireAdmin, Controller.getAdminOrders);
router.patch('/orders/:id', requireAuth, requireAdmin, Controller.updateAdminOrderStatus);

export default router;

