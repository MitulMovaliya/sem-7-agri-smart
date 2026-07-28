import { Request, Response, NextFunction } from 'express';
import { Op } from 'sequelize';
import { Order, Product, User } from '../../index.js';
import Helper from './OrderHelper.js';

export const getOrders = async (req: Request, res: Response, next: NextFunction) => {
  const user = req.user as User;

  try {
    const whereClause = user.role === 'admin' ? {} : {
      [Op.or]: [
        { buyerId: user.id },
        { farmerId: user.id }
      ]
    };

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

    return res.json(orders.map(Helper.formatOrder));
  } catch (err) {
    return next(err);
  }
};

export const createOrder = async (req: Request, res: Response, next: NextFunction) => {
  const { product_id, quantity, total_price, payment_method } = req.body;
  const user = req.user as User;

  if (!product_id || !quantity || !total_price) {
    return res.status(400).json({ error: 'Missing product_id, quantity, or total_price.' });
  }

  try {
    const product = await Product.findByPk(product_id);
    if (!product) {
      return res.status(404).json({ error: 'Product listing not found.' });
    }

    if (product.farmerId === user.id) {
      return res.status(400).json({ error: 'You cannot purchase your own crop listing.' });
    }

    if (product.status !== 'approved') {
      return res.status(400).json({ error: 'This listing is not available for purchase.' });
    }

    // 1. Create order record
    const order = await Order.create({
      productId: product.id,
      buyerId: user.id,
      farmerId: product.farmerId,
      quantity: Number(quantity),
      totalPrice: Number(total_price),
      status: 'pending',
      paymentStatus: 'unpaid',
      paymentMethod: payment_method || 'COD'
    });

    // 2. Mark product as sold
    product.status = 'sold';
    await product.save();

    return res.status(201).json(Helper.formatOrder(order));
  } catch (err) {
    return next(err);
  }
};

export const updateOrderStatus = async (req: Request, res: Response, next: NextFunction) => {
  const { id } = req.params;
  const { status, payment_status } = req.body;
  const user = req.user as User;

  try {
    const order = await Order.findByPk(id);
    if (!order) {
      return res.status(404).json({ error: 'Order not found.' });
    }

    if (order.buyerId !== user.id && order.farmerId !== user.id && user.role !== 'admin') {
      return res.status(403).json({ error: 'Unauthorized to modify this order.' });
    }

    if (status) {
      order.status = status;
    }
    if (payment_status) {
      order.paymentStatus = payment_status;
    }

    await order.save();
    return res.json(Helper.formatOrder(order));
  } catch (err) {
    return next(err);
  }
};

export default { getOrders, createOrder, updateOrderStatus };
