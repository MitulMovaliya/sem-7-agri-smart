import express from 'express';
import Controller from './PredictionController.js';
import { requireAuth } from '../../../middlewares/auth.js';

const router = express.Router();

router.post('/crop', requireAuth, Controller.getCropPrediction);
router.get('/locations', Controller.getCropLocationData);
router.post('/rainfall', requireAuth, Controller.getRainfallPrediction);
router.get('/history', requireAuth, Controller.getPredictionHistory);
router.get('/weather', requireAuth, Controller.getWeather);

export default router;
