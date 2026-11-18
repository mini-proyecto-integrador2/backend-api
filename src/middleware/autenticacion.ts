import type { NextFunction, Request, Response } from "express";
import { getAuth } from "firebase-admin/auth";
import "../config/firebase";
import { AppError } from "./AppError";

export type UsuarioAutenticado = {
  uid: string;
  email: string | null;
  nombre: string | null;
};

declare module "express-serve-static-core" {
  interface Request {
    user?: UsuarioAutenticado;
  }
}

export async function autenticacion(
  req: Request,
  _res: Response,
  next: NextFunction
) {
  const cabecera = req.headers.authorization;

  if (!cabecera || !cabecera.startsWith("Bearer ")) {
    return next(
      new AppError(401, "TOKEN_MISSING", "Falta el token de autenticación.")
    );
  }

  const token = cabecera.slice("Bearer ".length).trim();
  if (!token) {
    return next(
      new AppError(401, "TOKEN_MISSING", "Falta el token de autenticación.")
    );
  }

  try {
    const decodificado = await getAuth().verifyIdToken(token);
    req.user = {
      uid: decodificado.uid,
      email: decodificado.email ?? null,
      nombre: (decodificado.name as string | undefined) ?? null,
    };
    next();
  } catch {
    next(
      new AppError(
        401,
        "TOKEN_INVALID",
        "El token de autenticación no es válido o venció."
      )
    );
  }
}