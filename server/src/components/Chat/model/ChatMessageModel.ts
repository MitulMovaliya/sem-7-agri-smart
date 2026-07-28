import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../../../config/database.js';

export class ChatMessage extends Model {
  declare id: string;
  declare sessionId: string;
  declare role: 'user' | 'assistant' | 'system';
  declare content: string;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

ChatMessage.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    sessionId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'chat_sessions',
        key: 'id',
      },
    },
    role: {
      type: DataTypes.ENUM('user', 'assistant', 'system'),
      allowNull: false,
    },
    content: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
  },
  {
    sequelize,
    modelName: 'ChatMessage',
    tableName: 'chat_messages',
  }
);
