import express from 'express';
import Controller from './SoilController.js';
import { requireAuth } from '../../../middlewares/auth.js';

const router = express.Router();

router.post('/extract', requireAuth, Controller.extractSoilCard);

export default router;
