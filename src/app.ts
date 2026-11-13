import "dotenv/config";
import express from "express";
import cors from "cors";
import healthRoutes from "./routes/healthRoutes";
import baseRoutes from "./routes/baseRoutes";
import authRoutes from "./routes/authRoutes";
import usuariosRoutes from "./routes/usuariosRoutes";
import { manejarErrores, rutaNoEncontrada } from "./middleware/errorHandler";
import swaggerUi from "swagger-ui-express";
import { openApiSpec } from "./docs/openapi";
import { esquemasUsuarios, rutasUsuarios } from "./docs/openapiUsuarios";

const origenesPermitidos = (process.env.CORS_ORIGINS ?? "")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

// Especificación base + endpoints de usuarios (TS-01) + esquema de seguridad Bearer.
const base: any = openApiSpec;
const especificacion = {
  ...base,
  paths: { ...base.paths, ...rutasUsuarios },
  components: {
    ...base.components,
    schemas: { ...base.components?.schemas, ...esquemasUsuarios },
    securitySchemes: {
      bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT", description: "ID token de Firebase Auth" },
    },
  },
};

const app = express();

app.use(
  cors({
    origin: (origin, callback) => {
      // Sin origin (curl, health check de Render) o con origin permitido.
      if (!origin || origenesPermitidos.includes(origin)) {
        return callback(null, true);
      }
      // Origen no permitido: se rechaza sin lanzar error (antes respondía 500).
      callback(null, false); // CAMBIO
    },
  })
);
app.use(express.json());
app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(especificacion));

app.use("/api", healthRoutes);
app.use("/api", baseRoutes);
app.use("/api", authRoutes);
app.use("/api", usuariosRoutes);

app.use(rutaNoEncontrada);
app.use(manejarErrores);

export default app;