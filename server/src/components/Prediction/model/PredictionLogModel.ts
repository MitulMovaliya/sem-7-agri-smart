import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../../../config/database.js';

export class PredictionLog extends Model {
  declare id: string;
  declare userId: string;
  declare farmId: string | null;
  declare modelType: 'crop' | 'fertilizer' | 'yield' | 'rainfall' | 'soil_image';
  declare inputData: any;
  declare predictionResult: any;
  declare confidence: number | null;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

PredictionLog.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id',
      },
    },
    farmId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'farms',
        key: 'id',
      },
      onDelete: 'SET NULL',
    },
    modelType: {
      type: DataTypes.ENUM('crop', 'fertilizer', 'yield', 'rainfall', 'soil_image'),
      allowNull: false,
    },
    inputData: {
      type: DataTypes.JSONB,
      allowNull: false,
    },
    predictionResult: {
      type: DataTypes.JSONB,
      allowNull: false,
    },
    confidence: {
      type: DataTypes.DOUBLE,
      allowNull: true,
    },
  },
  {
    sequelize,
    modelName: 'PredictionLog',
    tableName: 'prediction_logs',
  }
);
