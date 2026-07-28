import { Sequelize } from "sequelize";
import dotenv from "dotenv";
import logger from "../utils/logger.js";

dotenv.config();

const databaseUrl =
  process.env.DATABASE_URL ||
  `postgres://${process.env.DB_USER || "postgres"}:${process.env.DB_PASSWORD || "password"}@${process.env.DB_HOST || "localhost"}:${process.env.DB_PORT || "5432"}/${process.env.DB_NAME || "agrismart"}`;

export const sequelize = new Sequelize(databaseUrl, {
  dialect: "postgres",
  logging: false,
  define: {
    underscored: true, // Use snake_case for fields in DB (matches original Supabase schemas)
    timestamps: true, // Automatically add createdAt and updatedAt fields
  },
});
