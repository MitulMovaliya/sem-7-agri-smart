import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../../../config/database.js';

export class WeatherCache extends Model {
  declare id: string;
  declare latitude: number;
  declare longitude: number;
  declare temp: number;
  declare humidity: number;
  declare rainfall: number;
  declare fetchedAt: Date;
}

WeatherCache.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    latitude: {
      type: DataTypes.DOUBLE,
      allowNull: false,
    },
    longitude: {
      type: DataTypes.DOUBLE,
      allowNull: false,
    },
    temp: {
      type: DataTypes.DOUBLE,
      allowNull: false,
    },
    humidity: {
      type: DataTypes.DOUBLE,
      allowNull: false,
    },
    rainfall: {
      type: DataTypes.DOUBLE,
      allowNull: false,
    },
    fetchedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    sequelize,
    modelName: 'WeatherCache',
    tableName: 'weather_caches',
    timestamps: false,
  }
);
