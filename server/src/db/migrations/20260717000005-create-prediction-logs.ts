import { DataTypes, QueryInterface } from 'sequelize';

export async function up(queryInterface: QueryInterface) {
  await queryInterface.createTable('prediction_logs', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      allowNull: false,
    },
    user_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
    },
    model_type: {
      type: DataTypes.ENUM('crop', 'fertilizer', 'yield', 'rainfall'),
      allowNull: false,
    },
    input_data: {
      type: DataTypes.JSONB,
      allowNull: false,
    },
    prediction_result: {
      type: DataTypes.JSONB,
      allowNull: false,
    },
    confidence: {
      type: DataTypes.DOUBLE,
      allowNull: true,
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: false,
    },
  });
}

export async function down(queryInterface: QueryInterface) {
  await queryInterface.dropTable('prediction_logs');
}
