import { DataTypes, QueryInterface } from 'sequelize';

export async function up(queryInterface: QueryInterface) {
  await queryInterface.createTable('soil_reports', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      allowNull: false,
    },
    farmer_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
    },
    source_type: {
      type: DataTypes.ENUM('pdf', 'image'),
      allowNull: false,
    },
    nitrogen: {
      type: DataTypes.DOUBLE,
      allowNull: true,
    },
    phosphorus: {
      type: DataTypes.DOUBLE,
      allowNull: true,
    },
    potassium: {
      type: DataTypes.DOUBLE,
      allowNull: true,
    },
    ph: {
      type: DataTypes.DOUBLE,
      allowNull: true,
    },
    organic_carbon: {
      type: DataTypes.DOUBLE,
      allowNull: true,
    },
    ec: {
      type: DataTypes.DOUBLE,
      allowNull: true,
    },
    raw_extraction: {
      type: DataTypes.JSONB,
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
  await queryInterface.dropTable('soil_reports');
}
