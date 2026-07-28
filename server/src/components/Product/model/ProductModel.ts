import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../../../config/database.js';

export class Product extends Model {
  declare id: string;
  declare farmerId: string;
  declare cropName: string;
  declare cropCategory: string;
  declare quantity: number;
  declare quantityUnit: string;
  declare pricePerUnit: number;
  declare description: string | null;
  declare qualityGrade: string | null;
  declare images: string[];
  declare status: 'pending' | 'approved' | 'rejected' | 'sold';
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

Product.init(
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
    cropName: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    cropCategory: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    quantity: {
      type: DataTypes.DOUBLE,
      allowNull: false,
    },
    quantityUnit: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    pricePerUnit: {
      type: DataTypes.DOUBLE,
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    qualityGrade: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    images: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: [],
    },
    status: {
      type: DataTypes.ENUM('pending', 'approved', 'rejected', 'sold'),
      allowNull: false,
      defaultValue: 'pending',
    },
  },
  {
    sequelize,
    modelName: 'Product',
    tableName: 'products',
  }
);
