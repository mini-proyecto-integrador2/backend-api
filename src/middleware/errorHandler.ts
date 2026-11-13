import type { NextFunction, Request, Response } from "express";
import { AppError } from "./AppError";

export function rutaNoEncontrada(_req: Request, res: Response) {
  res.status(404).json({
    error: { code: "ROUTE_NOT_FOUND", message: "La ruta solicitada no existe." },
  });
}

export function manejarErrores(
  error: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  if (error instanceof AppError) {
    // "campos" (opcional) indica qué campo falló en los errores de validación.
    const campos = (error as AppError & { campos?: Record<string, string> }).campos;
    return res.status(error.status).json({
      error: { code: error.code, message: error.message, ...(campos ? { campos } : {}) },
    });
  }
  // JSON malformado en el cuerpo de la petición: es error del cliente (400), no del servidor.
  if ((error as { type?: string } | null)?.type === "entity.parse.failed") {
    return res.status(400).json({
      error: { code: "INVALID_JSON", message: "El cuerpo de la petición no es un JSON válido." },
    });
  }
  console.error("Error no controlado:", error);
  res.status(500).json({
    error: { code: "INTERNAL_ERROR", message: "Ocurrió un error inesperado." },
  });
}