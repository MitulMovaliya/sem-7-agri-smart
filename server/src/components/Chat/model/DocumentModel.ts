import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../../../config/database.js';

export class Document extends Model {
  declare id: string;
  declare content: string;
  declare embedding: number[];
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

Document.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    content: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    embedding: {
      type: DataTypes.JSONB,
      allowNull: false,
    },
  },
  {
    sequelize,
    modelName: 'Document',
    tableName: 'documents',
  }
);
