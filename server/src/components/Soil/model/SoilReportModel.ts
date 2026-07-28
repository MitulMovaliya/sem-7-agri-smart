import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../../../config/database.js';

export class SoilReport extends Model {
  declare id: string;
  declare farmerId: string;
  declare farmId: string | null;
  declare sourceType: 'pdf' | 'image' | 'manual';
  declare nitrogen: number | null;
  declare phosphorus: number | null;
  declare potassium: number | null;
  declare ph: number | null;
  declare organicCarbon: number | null;
  declare ec: number | null;
  declare rawExtraction: any;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

SoilReport.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    farmerId: {
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
      onDelete: 'CASCADE',
    },
    sourceType: {
      type: DataTypes.ENUM('pdf', 'image', 'manual'),
      allowNull: false,
    },
    nitrogen: {
      type: DataTypes.DOUBLE,
      allowNull: true,
    },
    phosphorus: {
      type: DataTypes.DOUBLE,
      allowNull: true,
    },
    potassium: {
      type: DataTypes.DOUBLE,
      allowNull: true,
    },
    ph: {
      type: DataTypes.DOUBLE,
      allowNull: true,
    },
    organicCarbon: {
      type: DataTypes.DOUBLE,
      allowNull: true,
    },
    ec: {
      type: DataTypes.DOUBLE,
      allowNull: true,
    },
    rawExtraction: {
      type: DataTypes.JSONB,
      allowNull: true,
    },
  },
  {
    sequelize,
    modelName: 'SoilReport',
    tableName: 'soil_reports',
  }
);
