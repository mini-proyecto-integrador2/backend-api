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
    return res
      .status(error.status)
      .json({ error: { code: error.code, message: error.message } });
  }
  console.error("Error no controlado:", error);
  res.status(500).json({
    error: { code: "INTERNAL_ERROR", message: "Ocurrió un error inesperado." },
  });
}