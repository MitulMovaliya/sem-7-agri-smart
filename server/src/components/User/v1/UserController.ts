import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import passport from 'passport';
import bcrypt from 'bcryptjs';
import { User } from '../../index.js';
import Helper from './UserHelper.js';
import logger from '../../../utils/logger.js';

const jwtSecret = process.env.JWT_SECRET || 'supersecretjwtkeyforagrismartauth';

export const register = async (req: Request, res: Response, next: NextFunction) => {
  const { email, password, role, fullName, verificationDoc } = req.body;

  if (!email || !password || !fullName || !role) {
    return res.status(400).json({ error: 'Email, password, role, and full name are required.' });
  }

  try {
    const normalizedEmail = email.toLowerCase().trim();
    const existingUser = await User.findOne({ where: { email: normalizedEmail } });
    if (existingUser) {
      return res.status(400).json({ error: 'An account with this email already exists.' });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const user = await User.create({
      email: normalizedEmail,
      passwordHash,
      role,
      fullName,
      language: 'en',
      isVerified: role === 'admin' ? true : false,
      verificationStatus: role === 'admin' ? 'approved' : 'pending',
      verificationDoc: role === 'admin' ? null : verificationDoc
    });

    const token = jwt.sign({ id: user.id }, jwtSecret, { expiresIn: '7d' });

    return res.status(201).json({ token, user: Helper.formatUserProfile(user) });
  } catch (err) {
    logger.error('Registration controller error:', { error: err });
    return next(err);
  }
};

export const login = (req: Request, res: Response, next: NextFunction) => {
  passport.authenticate('local', { session: false }, (err: any, user: any, info: any) => {
    if (err) {
      return next(err);
    }
    if (!user) {
      return res.status(400).json({ error: info?.message || 'Login failed. Please check credentials.' });
    }

    const token = jwt.sign({ id: user.id }, jwtSecret, { expiresIn: '7d' });
    return res.json({ token, user: Helper.formatUserProfile(user) });
  })(req, res, next);
};

export const getMe = (req: Request, res: Response) => {
  const user = req.user as User;
  return res.json(Helper.formatUserProfile(user));
};

export const reapplyVerification = async (req: Request, res: Response, next: NextFunction) => {
  const user = req.user as User;
  const { verificationDoc } = req.body;

  if (!verificationDoc) {
    return res.status(400).json({ error: 'Verification document URL is required.' });
  }

  try {
    user.verificationStatus = 'pending';
    user.isVerified = false;
    user.verificationDoc = verificationDoc;
    user.verificationNote = null;
    await user.save();

    return res.json(Helper.formatUserProfile(user));
  } catch (err) {
    logger.error('Reapply verification controller error:', { error: err });
    return next(err);
  }
};

export default { register, login, getMe, reapplyVerification };
