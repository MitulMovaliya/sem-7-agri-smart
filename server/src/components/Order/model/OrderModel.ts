import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../../../config/database.js';

export class Order extends Model {
  declare id: string;
  declare productId: string;
  declare buyerId: string;
  declare farmerId: string;
  declare quantity: number;
  declare totalPrice: number;
  declare status: 'pending' | 'dispatched' | 'delivered' | 'completed' | 'cancelled' | 'rejected';
  declare paymentStatus: 'unpaid' | 'confirmed';
  declare paymentMethod: string;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

Order.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    productId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'products',
        key: 'id',
      },
    },
    buyerId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id',
      },
    },
    farmerId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id',
      },
    },
    quantity: {
      type: DataTypes.DOUBLE,
      allowNull: false,
    },
    totalPrice: {
      type: DataTypes.DOUBLE,
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM('pending', 'dispatched', 'delivered', 'completed', 'cancelled', 'rejected'),
      allowNull: false,
      defaultValue: 'pending',
    },
    paymentStatus: {
      type: DataTypes.ENUM('unpaid', 'confirmed'),
      allowNull: false,
      defaultValue: 'unpaid',
    },
    paymentMethod: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'COD',
    },
  },
  {
    sequelize,
    modelName: 'Order',
    tableName: 'orders',
  }
);
