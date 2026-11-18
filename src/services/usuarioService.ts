import {
  crearPerfil,
  nombreUsuarioDisponible,
  obtenerPerfil,
  PerfilExistenteError,
  UsuarioTomadoError,
} from "../repositories/usuarioRepository";
import type { DatosNuevoUsuario, Usuario } from "../repositories/usuarioRepository";
import { AppError } from "../middleware/AppError";

const REGEX_USUARIO = /^[A-Za-z0-9_]{3,20}$/;
const AVATARES = ["A", "B", "C", "D"];

function falloFirestore(error: unknown, mensaje: string): never {
  console.error("Error con Firestore:", error);
  throw new AppError(503, "FIRESTORE_UNAVAILABLE", mensaje);
}

export async function consultarDisponibilidad(usuario: unknown): Promise<boolean> {
  if (typeof usuario !== "string" || !REGEX_USUARIO.test(usuario)) {
    throw new AppError(
      400,
      "VALIDATION_ERROR",
      "El nombre de usuario debe tener entre 3 y 20 caracteres: letras, números o guion bajo."
    );
  }
  try {
    return await nombreUsuarioDisponible(usuario);
  } catch (error) {
    return falloFirestore(error, "No se pudo consultar el nombre de usuario. Intenta de nuevo.");
  }
}

export async function leerMiPerfil(uid: string): Promise<Usuario> {
  let perfil: Usuario | null;
  try {
    perfil = await obtenerPerfil(uid);
  } catch (error) {
    return falloFirestore(error, "No se pudo leer el perfil. Intenta de nuevo.");
  }
  if (!perfil) {
    throw new AppError(404, "PROFILE_NOT_FOUND", "Todavía no tienes un perfil creado.");
  }
  return perfil;
}

export async function registrarPerfil(
  uid: string,
  correo: string | null,
  cuerpo: Record<string, unknown>
): Promise<Usuario> {
  const nombres = typeof cuerpo.nombres === "string" ? cuerpo.nombres.trim() : "";
  const apellidos = typeof cuerpo.apellidos === "string" ? cuerpo.apellidos.trim() : "";
  const usuario = typeof cuerpo.usuario === "string" ? cuerpo.usuario : "";
  const avatar = typeof cuerpo.avatar === "string" ? cuerpo.avatar : "";

  if (!nombres) {
    throw new AppError(400, "VALIDATION_ERROR", "Los nombres son obligatorios.");
  }
  if (!REGEX_USUARIO.test(usuario)) {
    throw new AppError(
      400,
      "VALIDATION_ERROR",
      "El nombre de usuario debe tener entre 3 y 20 caracteres: letras, números o guion bajo."
    );
  }
  if (!AVATARES.includes(avatar)) {
    throw new AppError(400, "VALIDATION_ERROR", "El avatar debe ser A, B, C o D.");
  }
  if (!correo) {
    throw new AppError(400, "VALIDATION_ERROR", "La cuenta no tiene un correo asociado.");
  }

  const datos: DatosNuevoUsuario = { uid, nombres, apellidos, usuario, avatar, correo };

  try {
    return await crearPerfil(datos);
  } catch (error) {
    if (error instanceof UsuarioTomadoError) {
      throw new AppError(409, "USERNAME_TAKEN", "Ese nombre de usuario ya está en uso.");
    }
    if (error instanceof PerfilExistenteError) {
      throw new AppError(409, "PROFILE_EXISTS", "Esta cuenta ya tiene un perfil creado.");
    }
    return falloFirestore(error, "No se pudo guardar el perfil. Intenta de nuevo.");
  }
}