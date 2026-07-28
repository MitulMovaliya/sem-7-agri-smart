import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../../../config/database.js';

export class User extends Model {
  declare id: string;
  declare email: string;
  declare passwordHash: string;
  declare fullName: string;
  declare role: 'farmer' | 'buyer' | 'admin';
  declare language: 'hi' | 'en';
  declare isVerified: boolean;
  declare verificationStatus: 'pending' | 'approved' | 'rejected';
  declare verificationNote: string | null;
  declare verificationDoc: string | null;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

User.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
        isEmail: true,
      },
    },
    passwordHash: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    fullName: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    role: {
      type: DataTypes.ENUM('farmer', 'buyer', 'admin'),
      allowNull: false,
      defaultValue: 'farmer',
    },
    language: {
      type: DataTypes.ENUM('hi', 'en'),
      allowNull: false,
      defaultValue: 'en',
    },
    isVerified: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    verificationStatus: {
      type: DataTypes.ENUM('pending', 'approved', 'rejected'),
      allowNull: false,
      defaultValue: 'pending',
    },
    verificationNote: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    verificationDoc: {
      type: DataTypes.STRING,
      allowNull: true,
    },
  },
  {
    sequelize,
    modelName: 'User',
    tableName: 'users',
  }
);
