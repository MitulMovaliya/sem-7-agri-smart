import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../../../config/database.js';

export class Farm extends Model {
  declare id: string;
  declare farmerId: string;
  declare name: string;
  declare latitude: number;
  declare longitude: number;
  declare areaAcres: number | null;
  declare cropType: string | null;
  declare address: string | null;
  declare state: string | null;
  declare district: string | null;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

Farm.init(
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
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    latitude: {
      type: DataTypes.DOUBLE,
      allowNull: false,
    },
    longitude: {
      type: DataTypes.DOUBLE,
      allowNull: false,
    },
    areaAcres: {
      type: DataTypes.DOUBLE,
      allowNull: true,
    },
    cropType: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    address: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    state: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    district: {
      type: DataTypes.STRING,
      allowNull: true,
    },
  },
  {
    sequelize,
    modelName: 'Farm',
    tableName: 'farms',
  }
);
