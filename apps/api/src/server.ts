import express from "express";
import { registerRoutes } from "./routes";
import { cors } from "./middleware/cors";
import { errorHandler } from "./middlewares/errorHandler";

export function createServer() {
  const app = express();

  app.use(cors);
  app.use(express.json());

  registerRoutes(app);

  // centralized error handler (last)
  app.use(errorHandler);

  return app;
}
