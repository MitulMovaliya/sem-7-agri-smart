import { Request, Response } from 'express';
import { SoilReport, User } from '../../index.js';
import { GoogleGenAI } from '@google/genai';
import logger from '../../../utils/logger.js';

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  logger.warn("WARNING: GEMINI_API_KEY is missing from environment variables.");
}
const ai = new GoogleGenAI({ apiKey: apiKey || '' });

export const extractSoilCard = async (req: Request, res: Response) => {
  const { imageBase64, mimeType, farmId } = req.body;
  const user = req.user as User;

  if (!imageBase64 || !mimeType) {
    return res.status(400).json({ error: "Missing imageBase64 or mimeType." });
  }

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: [
        `Analyze the uploaded Indian government Soil Health Card image or report.
        Extract the parameters for Nitrogen (N), Phosphorus (P), Potassium (K), Soil pH, Organic Carbon (OC), and Electrical Conductivity (EC).
        If any value is missing or illegible, return null for that parameter. Output values as numerical figures.`,
        {
          inlineData: {
            mimeType: mimeType,
            data: imageBase64
          }
        }
      ],
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: 'OBJECT',
          properties: {
            nitrogen: { type: 'NUMBER', description: 'Nitrogen content (N) in kg/ha or ppm' },
            phosphorus: { type: 'NUMBER', description: 'Phosphorus content (P) in kg/ha or ppm' },
            potassium: { type: 'NUMBER', description: 'Potassium content (K) in kg/ha or ppm' },
            ph: { type: 'NUMBER', description: 'Soil pH value' },
            organic_carbon: { type: 'NUMBER', description: 'Organic carbon content percentage' },
            ec: { type: 'NUMBER', description: 'Electrical conductivity value' }
          },
          required: ['nitrogen', 'phosphorus', 'potassium', 'ph']
        }
      }
    });

    const extractionText = response.text;
    if (!extractionText) {
      throw new Error("Failed to extract content from Soil Health Card.");
    }
    const extractedData = JSON.parse(extractionText);

    // Save report parameters under the farmer's profile in database
    const report = await SoilReport.create({
      farmerId: user.id,
      farmId: farmId || null,
      sourceType: mimeType.includes('pdf') ? 'pdf' : 'image',
      nitrogen: extractedData.nitrogen,
      phosphorus: extractedData.phosphorus,
      potassium: extractedData.potassium,
      ph: extractedData.ph,
      organicCarbon: extractedData.organic_carbon,
      ec: extractedData.ec,
      rawExtraction: extractedData
    });

    return res.json({
      success: true,
      data: {
        id: report.id,
        farmer_id: report.farmerId,
        source_type: report.sourceType,
        nitrogen: report.nitrogen,
        phosphorus: report.phosphorus,
        potassium: report.potassium,
        ph: report.ph,
        organic_carbon: report.organicCarbon,
        ec: report.ec,
        raw_extraction: report.rawExtraction
      }
    });
  } catch (error) {
    logger.error("Soil card extraction controller error:", { error });
    return res.status(500).json({ error: "Failed to extract data from Soil Health Card. Please ensure the image is clear and try again." });
  }
};

export default { extractSoilCard };
