import type { NextFunction, Request, Response } from "express";
import { auth } from "../config/auth";
import { AppError } from "./AppError";

export interface UsuarioAutenticado {
  uid: string;
  correo?: string;
  nombre?: string;
  foto?: string;
}

declare global {
  namespace Express {
    interface Request {
      usuario?: UsuarioAutenticado;
    }
  }
}

// Exige "Authorization: Bearer <ID token de Firebase>" y lo verifica con Firebase Admin.
export async function requiereAuth(req: Request, _res: Response, next: NextFunction) {
  const cabecera = req.headers.authorization;
  if (!cabecera || !cabecera.startsWith("Bearer ")) {
    return next(new AppError(401, "UNAUTHORIZED", "Inicia sesión para continuar."));
  }
  try {
    const token = cabecera.slice("Bearer ".length).trim();
    const d = await auth.verifyIdToken(token);
    req.usuario = { uid: d.uid, correo: d.email, nombre: d.name, foto: d.picture };
    next();
  } catch {
    next(new AppError(401, "UNAUTHORIZED", "Tu sesión no es válida o expiró. Vuelve a iniciar sesión."));
  }
}
