import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import passport from "passport";
import morganMiddleware from "./middlewares/morgan.js";
import logger from "./utils/logger.js";

// Import Sequelize database connection
import { sequelize } from "./components/index.js";

// Import central routes loader
import routes from "./routes/index.js";

// Load env configurations
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Initialize passport strategies
import "./config/passport.js";

// Middlewares
app.use(cors({ origin: "*" }));
app.use(express.json({ limit: "10mb" })); // Expanded limit for base64 images
app.use(morganMiddleware);
app.use(passport.initialize());

// Serve static uploads folder (where local harvest photos are saved)
app.use(
  "/uploads",
  express.static(path.join(process.cwd(), "public", "uploads")),
);

// Mount API routes
routes(app);

// Health Check
app.get("/health", (req, res) => {
  res.json({
    status: "online",
    timestamp: new Date().toISOString(),
  });
});

// Sync database models (alter: true automatically applies new columns)
sequelize.sync({ alter: true })
  .then(() => {
    logger.info('PostgreSQL database synced successfully via Sequelize.');
    app.listen(PORT, () => {
      logger.info(`AgriSmart Backend Server listening on port ${PORT}`);
    });
  })
  .catch((err) => {
    logger.error('Unable to connect to the PostgreSQL database on startup:', err);
    // Start server even if database is offline for local development flexibility
    app.listen(PORT, () => {
      logger.info(`AgriSmart Backend Server listening on port ${PORT} (Database Offline)`);
    });
  });
