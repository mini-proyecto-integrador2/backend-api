import "dotenv/config";
import express from "express";
import cors from "cors";
import healthRoutes from "./routes/healthRoutes";
import baseRoutes from "./routes/baseRoutes";
import { manejarErrores, rutaNoEncontrada } from "./middleware/errorHandler";

const origenesPermitidos = (process.env.CORS_ORIGINS ?? "")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

const app = express();

app.use(
  cors({
    origin: (origin, callback) => {
      // Sin origin (curl, health check de Render) o con origin permitido.
      if (!origin || origenesPermitidos.includes(origin)) {
        return callback(null, true);
      }
      callback(new Error("Origen no permitido por CORS"));
    },
  })
);
app.use(express.json());

app.use("/api", healthRoutes);
app.use("/api", baseRoutes);

app.use(rutaNoEncontrada);
app.use(manejarErrores);

export default app;