import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../../../config/database.js';

export class ChatSession extends Model {
  declare id: string;
  declare userId: string;
  declare threadId: string;
  declare title: string;
  declare language: string;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

ChatSession.init(
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
    threadId: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'Chat with AI Assistant',
    },
    language: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'en',
    },
  },
  {
    sequelize,
    modelName: 'ChatSession',
    tableName: 'chat_sessions',
  }
);
