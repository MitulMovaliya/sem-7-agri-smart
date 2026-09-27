import { QueryInterface } from 'sequelize';

export async function up(queryInterface: QueryInterface) {
  await queryInterface.sequelize.query(
    `ALTER TYPE "enum_prediction_logs_model_type" ADD VALUE IF NOT EXISTS 'soil_image';`
  );
}

export async function down(queryInterface: QueryInterface) {
  // Reverting ENUM additions in PostgreSQL is a no-op without full type recreation
}
