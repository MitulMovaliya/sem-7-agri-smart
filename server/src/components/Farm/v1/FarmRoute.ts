import express from 'express';
import Controller from './FarmController.js';
import { requireAuth } from '../../../middlewares/auth.js';

const router = express.Router();

router.use(requireAuth);

router.get('/', Controller.getFarms);
router.post('/', Controller.createFarm);
router.put('/:id', Controller.updateFarm);
router.delete('/:id', Controller.deleteFarm);
router.post('/:id/soil-reports', Controller.addSoilReport);

export default router;
