import { sequelize } from '../config/database.js';
import { User } from './User/model/UserModel.js';
import { Product } from './Product/model/ProductModel.js';
import { Order } from './Order/model/OrderModel.js';
import { SoilReport } from './Soil/model/SoilReportModel.js';
import { PredictionLog } from './Prediction/model/PredictionLogModel.js';
import { ChatSession } from './Chat/model/ChatSessionModel.js';
import { ChatMessage } from './Chat/model/ChatMessageModel.js';
import { Document } from './Chat/model/DocumentModel.js';
import { Farm } from './Farm/model/FarmModel.js';
import { WeatherCache } from './Prediction/model/WeatherCacheModel.js';

// Setup Relationships

// User - Farm
User.hasMany(Farm, { foreignKey: 'farmerId', as: 'farms' });
Farm.belongsTo(User, { foreignKey: 'farmerId', as: 'farmer' });

// User - Product
User.hasMany(Product, { foreignKey: 'farmerId', as: 'listings' });
Product.belongsTo(User, { foreignKey: 'farmerId', as: 'profiles' });

// User - Order
User.hasMany(Order, { foreignKey: 'buyerId', as: 'purchases' });
User.hasMany(Order, { foreignKey: 'farmerId', as: 'sales' });
Order.belongsTo(User, { foreignKey: 'buyerId', as: 'buyer' });
Order.belongsTo(User, { foreignKey: 'farmerId', as: 'farmer' });
Order.belongsTo(User, { foreignKey: 'farmerId', as: 'profiles' });

// Product - Order
Product.hasMany(Order, { foreignKey: 'productId', as: 'orders' });
Order.belongsTo(Product, { foreignKey: 'productId', as: 'products' });

// User - SoilReport
User.hasMany(SoilReport, { foreignKey: 'farmerId', as: 'soilReports' });
SoilReport.belongsTo(User, { foreignKey: 'farmerId', as: 'farmer' });

// Farm - SoilReport
Farm.hasMany(SoilReport, { foreignKey: 'farmId', as: 'soilReports', onDelete: 'CASCADE' });
SoilReport.belongsTo(Farm, { foreignKey: 'farmId', as: 'farm' });

// User - PredictionLog
User.hasMany(PredictionLog, { foreignKey: 'userId', as: 'predictionLogs' });
PredictionLog.belongsTo(User, { foreignKey: 'userId', as: 'user' });

// Farm - PredictionLog
Farm.hasMany(PredictionLog, { foreignKey: 'farmId', as: 'predictionLogs', onDelete: 'SET NULL' });
PredictionLog.belongsTo(Farm, { foreignKey: 'farmId', as: 'farm' });

// User - ChatSession
User.hasMany(ChatSession, { foreignKey: 'userId', as: 'chatSessions' });
ChatSession.belongsTo(User, { foreignKey: 'userId', as: 'user' });

// ChatSession - ChatMessage
ChatSession.hasMany(ChatMessage, { foreignKey: 'sessionId', as: 'messages' });
ChatMessage.belongsTo(ChatSession, { foreignKey: 'sessionId', as: 'session' });

export {
  sequelize,
  User,
  Product,
  Order,
  SoilReport,
  PredictionLog,
  WeatherCache,
  ChatSession,
  ChatMessage,
  Document,
  Farm
};
