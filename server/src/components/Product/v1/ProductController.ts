import { Request, Response, NextFunction } from 'express';
import { Product, User } from '../../index.js';
import Helper from './ProductHelper.js';

export const getProducts = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { farmer_id, status } = req.query;
    const whereClause: any = {};

    if (farmer_id) {
      whereClause.farmerId = farmer_id;
    }
    if (status) {
      whereClause.status = status;
    } else if (!farmer_id) {
      whereClause.status = 'approved';
    }

    const products = await Product.findAll({
      where: whereClause,
      include: [{
        model: User,
        as: 'profiles',
        attributes: ['fullName']
      }],
      order: [['createdAt', 'DESC']]
    });
    
    return res.json(products.map(Helper.formatProduct));
  } catch (err) {
    return next(err);
  }
};

export const createProduct = async (req: Request, res: Response, next: NextFunction) => {
  const { crop_name, crop_category, quantity, quantity_unit, price_per_unit, quality_grade, description, images } = req.body;
  const user = req.user as User;

  if (!crop_name || !crop_category || !quantity || !quantity_unit || !price_per_unit) {
    return res.status(400).json({ error: 'Missing required crop fields.' });
  }

  try {
    const product = await Product.create({
      farmerId: user.id,
      cropName: crop_name,
      cropCategory: crop_category,
      quantity: Number(quantity),
      quantityUnit: quantity_unit,
      pricePerUnit: Number(price_per_unit),
      qualityGrade: quality_grade,
      description,
      images: images || [],
      status: user.role === 'admin' ? 'approved' : 'pending'
    });

    return res.status(201).json(Helper.formatProduct(product));
  } catch (err) {
    return next(err);
  }
};

export const updateProductStatus = async (req: Request, res: Response, next: NextFunction) => {
  const { id } = req.params;
  const { status, rejection_reason, note } = req.body;
  const user = req.user as User;

  if (!status) {
    return res.status(400).json({ error: 'Status is required.' });
  }

  try {
    const product = await Product.findByPk(id);
    if (!product) {
      return res.status(404).json({ error: 'Crop listing not found.' });
    }

    if (product.farmerId !== user.id && user.role !== 'admin') {
      return res.status(403).json({ error: 'Unauthorized to modify this listing.' });
    }

    product.status = status;
    if (rejection_reason !== undefined) {
      product.rejectionReason = rejection_reason;
    } else if (note !== undefined) {
      product.rejectionReason = note;
    } else if (status === 'approved') {
      product.rejectionReason = null;
    }
    await product.save();

    return res.json(Helper.formatProduct(product));
  } catch (err) {
    return next(err);
  }
};

export const deleteProduct = async (req: Request, res: Response, next: NextFunction) => {
  const { id } = req.params;
  const user = req.user as User;

  try {
    const product = await Product.findByPk(id);
    if (!product) {
      return res.status(404).json({ error: 'Crop listing not found.' });
    }

    if (product.farmerId !== user.id && user.role !== 'admin') {
      return res.status(403).json({ error: 'Unauthorized to delete this listing.' });
    }

    await product.destroy();
    return res.json({ success: true, message: 'Listing deleted successfully.' });
  } catch (err) {
    return next(err);
  }
};

export default { getProducts, createProduct, updateProductStatus, deleteProduct };
