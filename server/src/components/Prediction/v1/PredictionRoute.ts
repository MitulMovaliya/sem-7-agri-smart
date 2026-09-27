import express from 'express';
import multer from 'multer';
import Controller from './PredictionController.js';
import { requireAuth } from '../../../middlewares/auth.js';

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });
const router = express.Router();

router.post('/crop', requireAuth, Controller.getCropPrediction);
router.get('/locations', Controller.getCropLocationData);
router.post('/rainfall', requireAuth, Controller.getRainfallPrediction);
router.post('/fertilizer', requireAuth, Controller.getFertilizerPrediction);
router.get('/fertilizer-options', Controller.getFertilizerOptions);
router.post('/soil-image', requireAuth, upload.single('image'), Controller.getSoilImagePrediction);
router.get('/history', requireAuth, Controller.getPredictionHistory);
router.get('/weather', requireAuth, Controller.getWeather);

export default router;
