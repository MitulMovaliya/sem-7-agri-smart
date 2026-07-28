import { Request, Response, NextFunction } from 'express';
import { User, Product } from '../../index.js';
import UserHelper from '../../User/v1/UserHelper.js';
import ProductHelper from '../../Product/v1/ProductHelper.js';

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

export default { getUsers, verifyUser, getPendingProducts, getAdminProducts };

