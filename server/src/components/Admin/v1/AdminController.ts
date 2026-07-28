import { Request, Response, NextFunction } from 'express';
import { User, Product, Order } from '../../index.js';
import UserHelper from '../../User/v1/UserHelper.js';
import ProductHelper from '../../Product/v1/ProductHelper.js';
import OrderHelper from '../../Order/v1/OrderHelper.js';

export const getUsers = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const users = await User.findAll({
      order: [['createdAt', 'DESC']]
    });
    return res.json(users.map(UserHelper.formatUserProfile));
  } catch (err) {
    return next(err);
  }
};

export const verifyUser = async (req: Request, res: Response, next: NextFunction) => {
  const { id } = req.params;
  const { status, note } = req.body; // status: 'approved' | 'rejected'

  try {
    const userToVerify = await User.findByPk(id);
    if (!userToVerify) {
      return res.status(404).json({ error: 'User profile not found.' });
    }

    if (userToVerify.role === 'admin') {
      return res.status(400).json({ error: 'Admin profiles do not require KYC verification.' });
    }

    const targetStatus = status || 'approved';
    if (!['approved', 'rejected', 'pending'].includes(targetStatus)) {
      return res.status(400).json({ error: 'Invalid verification status.' });
    }

    userToVerify.verificationStatus = targetStatus as any;
    userToVerify.isVerified = targetStatus === 'approved';
    userToVerify.verificationNote = note || null;
    await userToVerify.save();

    return res.json({ success: true, user: UserHelper.formatUserProfile(userToVerify) });
  } catch (err) {
    return next(err);
  }
};

export const getPendingProducts = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const pendingCrops = await Product.findAll({
      where: { status: 'pending' },
      include: [{
        model: User,
        as: 'profiles',
        attributes: ['fullName']
      }],
      order: [['createdAt', 'ASC']]
    });

    return res.json(pendingCrops.map(ProductHelper.formatProduct));
  } catch (err) {
    return next(err);
  }
};

export const getAdminProducts = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { status } = req.query;
    const whereClause: any = {};

    if (status && status !== 'all') {
      whereClause.status = status;
    }

    const crops = await Product.findAll({
      where: whereClause,
      include: [{
        model: User,
        as: 'profiles',
        attributes: ['fullName']
      }],
      order: [['createdAt', 'DESC']]
    });

    return res.json(crops.map(ProductHelper.formatProduct));
  } catch (err) {
    return next(err);
  }
};

export const getAdminOrders = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { status, payment_status, search } = req.query;
    const whereClause: any = {};

    if (status && status !== 'all') {
      whereClause.status = status;
    }
    if (payment_status && payment_status !== 'all') {
      whereClause.paymentStatus = payment_status;
    }

    const orders = await Order.findAll({
      where: whereClause,
      include: [
        {
          model: Product,
          as: 'products'
        },
        {
          model: User,
          as: 'buyer',
          attributes: ['id', 'fullName', 'email']
        },
        {
          model: User,
          as: 'farmer',
          attributes: ['id', 'fullName', 'email']
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    let formattedOrders = orders.map(OrderHelper.formatOrder);

    if (search && typeof search === 'string' && search.trim() !== '') {
      const q = search.toLowerCase().trim();
      formattedOrders = formattedOrders.filter(o =>
        o.id.toLowerCase().includes(q) ||
        (o.products?.crop_name && o.products.crop_name.toLowerCase().includes(q)) ||
        (o.buyer?.full_name && o.buyer.full_name.toLowerCase().includes(q)) ||
        (o.buyer?.email && o.buyer.email.toLowerCase().includes(q)) ||
        (o.farmer?.full_name && o.farmer.full_name.toLowerCase().includes(q)) ||
        (o.farmer?.email && o.farmer.email.toLowerCase().includes(q))
      );
    }

    return res.json(formattedOrders);
  } catch (err) {
    return next(err);
  }
};

export const updateAdminOrderStatus = async (req: Request, res: Response, next: NextFunction) => {
  const { id } = req.params;
  const { status, payment_status } = req.body;

  try {
    const order = await Order.findByPk(id, {
      include: [
        { model: Product, as: 'products' },
        { model: User, as: 'buyer', attributes: ['id', 'fullName', 'email'] },
        { model: User, as: 'farmer', attributes: ['id', 'fullName', 'email'] }
      ]
    });

    if (!order) {
      return res.status(404).json({ error: 'Order not found.' });
    }

    if (status) {
      if (!['pending', 'dispatched', 'delivered', 'completed', 'cancelled', 'rejected'].includes(status)) {
        return res.status(400).json({ error: 'Invalid order status value.' });
      }
      order.status = status;
    }

    if (payment_status) {
      if (!['unpaid', 'confirmed'].includes(payment_status)) {
        return res.status(400).json({ error: 'Invalid payment status value.' });
      }
      order.paymentStatus = payment_status;
    }

    await order.save();
    return res.json(OrderHelper.formatOrder(order));
  } catch (err) {
    return next(err);
  }
};

export default { getUsers, verifyUser, getPendingProducts, getAdminProducts, getAdminOrders, updateAdminOrderStatus };


