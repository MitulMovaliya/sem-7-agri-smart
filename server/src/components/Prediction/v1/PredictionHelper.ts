import { PredictionLog } from '../../index.js';
import logger from '../../../utils/logger.js';

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:8000';

export async function fetchPredictionAndLog(
  modelType: 'crop' | 'rainfall', 
  endpoint: string, 
  payload: any, 
  userId: string,
  farmId?: string
) {
  try {
    const url = `${ML_SERVICE_URL}${endpoint}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errMsg = await response.text();
      throw new Error(`ML Service returned error: ${errMsg}`);
    }

    const result = await response.json();

    // Log the prediction audit record in PostgreSQL
    try {
      await PredictionLog.create({
        userId,
        farmId: farmId || null,
        modelType,
        inputData: payload,
        predictionResult: result,
        confidence: result.confidence ? Number((Number(result.confidence) / 100).toFixed(4)) : null
      });
    } catch (dbError) {
      logger.error("Failed to write prediction log to database:", { error: dbError });
    }

    return result;
  } catch (error) {
    logger.error(`Error in ML proxy helper for ${modelType}:`, { error });
    throw error;
  }
}

export default { fetchPredictionAndLog };
