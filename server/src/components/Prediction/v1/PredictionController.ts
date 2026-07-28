import { Request, Response } from 'express';
import { User, PredictionLog, WeatherCache, Farm } from '../../index.js';
import Helper from './PredictionHelper.js';
import logger from '../../../utils/logger.js';
import { Op } from 'sequelize';

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:8000';

function getHaversineDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371; // Earth radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export const getCropPrediction = async (req: Request, res: Response) => {
  const { N, P, K, temperature, humidity, ph, rainfall, farmId } = req.body;
  const user = req.user as User;

  if ([N, P, K, temperature, humidity, ph, rainfall].some(val => val === undefined || val === null)) {
    return res.status(400).json({ error: "Missing soil or weather parameters." });
  }

  try {
    const payload = { N: Number(N), P: Number(P), K: Number(K), temperature: Number(temperature), humidity: Number(humidity), ph: Number(ph), rainfall: Number(rainfall) };
    const result = await Helper.fetchPredictionAndLog('crop', '/predict/crop', payload, user.id, farmId);
    return res.json(result);
  } catch (error) {
    return res.status(500).json({ error: "Failed to run Crop Prediction model." });
  }
};

export const getFertilizerPrediction = async (req: Request, res: Response) => {
  const { Temperature, Humidity, Moisture, Soil_Type, Crop_Type, N, P, K, farmId } = req.body;
  const user = req.user as User;

  if ([Temperature, Humidity, Moisture, Soil_Type, Crop_Type, N, P, K].some(val => val === undefined || val === null)) {
    return res.status(400).json({ error: "Missing fertilizer recommendation parameters." });
  }

  try {
    const payload = {
      Temperature: Number(Temperature),
      Humidity: Number(Humidity),
      Moisture: Number(Moisture),
      "Soil Type": Soil_Type,
      "Crop Type": Crop_Type,
      N: Number(N),
      P: Number(P),
      K: Number(K)
    };
    const result = await Helper.fetchPredictionAndLog('fertilizer', '/predict/fertilizer', payload, user.id, farmId);
    return res.json(result);
  } catch (error) {
    return res.status(500).json({ error: "Failed to run Fertilizer Prediction model." });
  }
};

export const getYieldPrediction = async (req: Request, res: Response) => {
  const { State, District, Season, Crop, Area, Temperature, Rainfall, farmId } = req.body;
  const user = req.user as User;

  if ([State, District, Season, Crop, Area, Temperature, Rainfall].some(val => val === undefined || val === null)) {
    return res.status(400).json({ error: "Missing yield estimation parameters." });
  }

  const numArea = Number(Area);
  if (isNaN(numArea) || numArea <= 0) {
    return res.status(400).json({ error: "Farm area must be a positive number greater than 0 hectares." });
  }

  try {
    const payload = { State, District, Season, Crop, Area: numArea, Temperature: Number(Temperature), Rainfall: Number(Rainfall) };
    const result = await Helper.fetchPredictionAndLog('yield', '/predict/yield', payload, user.id, farmId);
    return res.json(result);
  } catch (error) {
    return res.status(500).json({ error: "Failed to run Yield Prediction model." });
  }
};

export const getRainfallPrediction = async (req: Request, res: Response) => {
  const { year, month, farmId } = req.body;
  const user = req.user as User;

  if (!year || !month) {
    return res.status(400).json({ error: "Missing target year or month." });
  }

  try {
    const url = `${ML_SERVICE_URL}/predict/rainfall?year=${year}&month=${month}`;
    const response = await fetch(url, { method: 'POST' });

    if (!response.ok) {
      throw new Error("ML Service failed to return rainfall forecast.");
    }

    const result = await response.json();

    try {
      await PredictionLog.create({
        userId: user.id,
        farmId: farmId || null,
        modelType: 'rainfall',
        inputData: { year, month },
        predictionResult: result,
        confidence: null
      });
    } catch (dbError) {
      logger.error("Failed to write rainfall log to database:", { error: dbError });
    }

    return res.json(result);
  } catch (error) {
    logger.error("Rainfall proxy error:", { error });
    return res.status(500).json({ error: "Failed to run Rainfall Forecast model." });
  }
};

export const getPredictionHistory = async (req: Request, res: Response) => {
  const user = req.user as User;
  const { farmId } = req.query;
  try {
    const whereClause: any = { userId: user.id };
    if (farmId) {
      whereClause.farmId = farmId;
    }
    const logs = await PredictionLog.findAll({
      where: whereClause,
      include: [{
        model: Farm,
        as: 'farm',
        attributes: ['name']
      }],
      order: [['createdAt', 'DESC']]
    });
    return res.json(logs);
  } catch (error) {
    return res.status(500).json({ error: "Failed to fetch prediction history." });
  }
};

export const getWeather = async (req: Request, res: Response) => {
  let latVal: number | undefined;
  let lngVal: number | undefined;

  const { farmId, latitude, longitude } = req.query;

  if (farmId) {
    try {
      const farm = await Farm.findByPk(farmId as string);
      if (!farm) {
        return res.status(404).json({ error: "Farm not found." });
      }
      latVal = farm.latitude;
      lngVal = farm.longitude;
    } catch (error) {
      return res.status(500).json({ error: "Failed to fetch farm coordinates." });
    }
  } else if (latitude !== undefined && longitude !== undefined) {
    latVal = Number(latitude);
    lngVal = Number(longitude);
  }

  if (latVal === undefined || lngVal === undefined || isNaN(latVal) || isNaN(lngVal)) {
    return res.status(400).json({ error: "Latitude and longitude, or farmId is required." });
  }

  try {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const freshCaches = await WeatherCache.findAll({
      where: {
        fetchedAt: {
          [Op.gt]: oneHourAgo
        }
      }
    });

    let nearestCache: WeatherCache | null = null;
    let minDistance = 10.0; // 10 km limit

    for (const cache of freshCaches) {
      const distance = getHaversineDistance(latVal, lngVal, cache.latitude, cache.longitude);
      if (distance < minDistance) {
        minDistance = distance;
        nearestCache = cache;
      }
    }

    if (nearestCache) {
      return res.json({
        success: true,
        cached: true,
        distanceKm: Number(minDistance.toFixed(2)),
        data: {
          temperature: nearestCache.temp,
          humidity: nearestCache.humidity,
          rainfall: nearestCache.rainfall
        }
      });
    }

    // Call Open-Meteo API
    const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${latVal}&longitude=${lngVal}&current=temperature_2m,relative_humidity_2m,rain`;
    const apiResponse = await fetch(weatherUrl);
    if (!apiResponse.ok) {
      throw new Error(`Open-Meteo weather API returned status: ${apiResponse.status}`);
    }

    const apiData = await apiResponse.json();
    const temp = apiData.current?.temperature_2m ?? 25.0;
    const humidity = apiData.current?.relative_humidity_2m ?? 60.0;
    const rainfall = apiData.current?.rain ?? 0.0;

    const cacheEntry = await WeatherCache.create({
      latitude: latVal,
      longitude: lngVal,
      temp,
      humidity,
      rainfall,
      fetchedAt: new Date()
    });

    return res.json({
      success: true,
      cached: false,
      data: {
        temperature: cacheEntry.temp,
        humidity: cacheEntry.humidity,
        rainfall: cacheEntry.rainfall
      }
    });
  } catch (error: any) {
    logger.error("Weather lookup error:", { error: error.message || error });
    return res.status(500).json({ error: "Failed to fetch weather metrics." });
  }
};

export default { 
  getCropPrediction, 
  getFertilizerPrediction, 
  getYieldPrediction, 
  getRainfallPrediction, 
  getPredictionHistory,
  getWeather
};
