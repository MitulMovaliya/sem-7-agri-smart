import express from 'express';
import Controller from './UserController.js';
import { requireAuth } from '../../../middlewares/auth.js';

const router = express.Router();

router.post('/register', Controller.register);
router.post('/login', Controller.login);
router.get('/me', requireAuth, Controller.getMe);
router.patch('/reapply', requireAuth, Controller.reapplyVerification);

export default router;
